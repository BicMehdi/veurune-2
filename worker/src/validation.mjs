const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const SAVE_ID = /^VEY-(\d{4})(?:[A-Z]+)?$/;
const HIDDEN_KEYS = new Set(["hidden_state", "secrets", "private_agendas", "sealed_revelations", "gm_only"]);

function fail(message) {
  throw new Error(message);
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label}: objet attendu`);
  return value;
}

function fields(value, required, label) {
  const record = object(value, label);
  for (const field of required) {
    if (!(field in record)) fail(`${label}: champ obligatoire manquant: ${field}`);
  }
  return record;
}

function instant(value, label) {
  if (typeof value !== "string" || !ISO_INSTANT.test(value)) fail(`${label}: date UTC ISO-8601 attendue`);
}

function eventTime(value, label) {
  if (typeof value === "string") return instant(value, label);
  const time = object(value, label);
  if (!Number.isInteger(time.year) || time.year < 1 || !Number.isInteger(time.day) || time.day < 1 || typeof time.clock !== "string" || !CLOCK.test(time.clock)) {
    fail(`${label}: temps de campagne {year, day, clock} invalide`);
  }
}

function sequence(saveId) {
  const match = SAVE_ID.exec(saveId);
  if (!match) fail(`save_id invalide: ${saveId}`);
  return Number(match[1]);
}

export function nextSaveId(parentSaveId) {
  return `VEY-${String(sequence(parentSaveId) + 1).padStart(4, "0")}`;
}

function assertPlayerVisible(value, label, path = []) {
  if (value === "hidden") fail(`${label}: marqueur hidden interdit: ${path.join(".")}`);
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertPlayerVisible(child, label, [...path, index]));
    return;
  }
  if (!value || typeof value !== "object") return;
  if (value.status === "unresolved_hidden") fail(`${label}: état MJ interdit: ${path.join(".")}`);
  for (const [key, child] of Object.entries(value)) {
    if (HIDDEN_KEYS.has(key)) fail(`${label}: clé MJ interdite: ${[...path, key].join(".")}`);
    assertPlayerVisible(child, label, [...path, key]);
  }
}

export function eventFileForTurn(turn) {
  if (!Number.isInteger(turn) || turn < 0) fail("turn invalide pour le journal");
  const start = Math.floor(turn / 100) * 100;
  const end = start + 99;
  return `events/${String(start).padStart(4, "0")}-${String(end).padStart(4, "0")}.jsonl`;
}

function jsonDocument(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function mergePatch(targetValue, patchValue) {
  if (!patchValue || typeof patchValue !== "object" || Array.isArray(patchValue)) return patchValue;
  const target = targetValue && typeof targetValue === "object" && !Array.isArray(targetValue)
    ? { ...targetValue }
    : {};
  for (const [key, value] of Object.entries(patchValue)) {
    if (value === null) delete target[key];
    else target[key] = mergePatch(target[key], value);
  }
  return target;
}

function rejectReservedKeys(patch, reserved, label) {
  const record = object(patch, label);
  for (const key of Object.keys(record)) {
    if (reserved.has(key)) fail(`${label}: champ géré par le serveur interdit: ${key}`);
  }
  return record;
}

const CURRENT_SERVER_KEYS = new Set([
  "save_id", "parent_save_id", "turn", "checkpoint_kind", "fiction_advanced",
  "event_time", "record_time", "last_event_id", "next_expected_save",
]);
const PROJECTION_SERVER_KEYS = new Set(["save_id", "turn", "audience"]);
const EVENT_SERVER_KEYS = new Set(["save_id", "parent_save_id", "turn", "event_time", "record_time"]);

export function materializeTurnPayload(baseCurrentValue, baseWorldValue, baseHiddenValue, payloadValue) {
  const payload = object(payloadValue, "save_turn");
  if (payload.mode !== "patch") return payloadValue;

  const base = fields(baseCurrentValue, ["save_id", "turn", "next_expected_save"], "CURRENT distant");
  const fast = fields(payload, [
    "expected_head_sha", "expected_current_save_id", "save_id", "turn", "event_time", "record_time",
    "current_patch", "world_patch", "hidden_patch", "events",
  ], "save_turn patch");
  const currentPatch = rejectReservedKeys(fast.current_patch, CURRENT_SERVER_KEYS, "current_patch");
  const worldPatch = rejectReservedKeys(fast.world_patch, PROJECTION_SERVER_KEYS, "world_patch");
  const hiddenPatch = rejectReservedKeys(fast.hidden_patch, PROJECTION_SERVER_KEYS, "hidden_patch");
  if (!Array.isArray(fast.events) || fast.events.length === 0 || fast.events.length > 50) {
    fail("events doit contenir entre 1 et 50 événements atomiques");
  }

  instant(fast.record_time, "record_time");
  eventTime(fast.event_time, "event_time");
  const saveId = nextSaveId(base.save_id);
  const turn = base.turn + 1;
  const parentSaveId = base.save_id;
  if (fast.save_id !== saveId) fail(`save_id patch invalide: ${fast.save_id}; attendu ${saveId}`);
  if (fast.turn !== turn) fail(`turn patch invalide: ${fast.turn}; attendu ${turn}`);
  const events = fast.events.map((value, index) => {
    const event = rejectReservedKeys(value, EVENT_SERVER_KEYS, `events[${index}]`);
    return {
      ...event,
      save_id: saveId,
      parent_save_id: parentSaveId,
      turn,
      event_time: fast.event_time,
      record_time: fast.record_time,
    };
  });
  const lastEvent = fields(events.at(-1), ["event_id"], "dernier événement");
  const current = {
    ...mergePatch(base, currentPatch),
    save_id: saveId,
    parent_save_id: parentSaveId,
    turn,
    checkpoint_kind: "narrative_turn",
    fiction_advanced: true,
    event_time: fast.event_time,
    record_time: fast.record_time,
    last_event_id: lastEvent.event_id,
    next_expected_save: {
      save_id: nextSaveId(saveId),
      parent_save_id: saveId,
      turn: turn + 1,
    },
  };
  const world = {
    ...mergePatch(baseWorldValue, worldPatch),
    save_id: saveId,
    turn,
    audience: "player_visible",
  };
  const hidden = {
    ...mergePatch(baseHiddenValue, hiddenPatch),
    save_id: saveId,
    turn,
    audience: "gm_only",
  };
  return {
    expected_head_sha: fast.expected_head_sha,
    expected_current_save_id: fast.expected_current_save_id,
    save: current,
    current,
    world,
    hidden,
    events,
  };
}

export function parseDocument(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label}: YAML/JSON non pris en charge (${error instanceof Error ? error.message : String(error)})`);
  }
}

function existingEventIds(text) {
  const ids = new Set();
  const events = [];
  for (const [index, line] of text.split(/\r?\n/).filter(Boolean).entries()) {
    const event = fields(parseDocument(line, `journal existant ligne ${index + 1}`), ["event_id"], `journal existant ligne ${index + 1}`);
    if (typeof event.event_id !== "string" || !event.event_id) fail(`journal existant ligne ${index + 1}: event_id invalide`);
    if (ids.has(event.event_id)) fail(`journal existant: event_id dupliqué ${event.event_id}`);
    ids.add(event.event_id);
    events.push(event);
  }
  return { ids, events };
}

export function validateTurnPayload(baseCurrentValue, existingEventsText, payloadValue) {
  const base = fields(baseCurrentValue, ["save_id", "turn", "last_event_id", "next_expected_save"], "CURRENT distant");
  const payload = fields(payloadValue, ["expected_head_sha", "expected_current_save_id", "save", "current", "world", "hidden", "events"], "save_turn");
  const save = fields(payload.save, ["save_id", "parent_save_id", "turn", "event_time", "record_time", "fiction_advanced"], "save");
  const current = fields(payload.current, ["save_id", "parent_save_id", "turn", "record_time", "last_event_id", "next_expected_save"], "current");
  const world = fields(payload.world, ["save_id", "turn", "audience"], "world");
  const hidden = fields(payload.hidden, ["save_id", "turn", "audience"], "hidden");

  if (typeof payload.expected_head_sha !== "string" || !/^[0-9a-f]{40}$/i.test(payload.expected_head_sha)) fail("expected_head_sha invalide");
  if (payload.expected_current_save_id !== base.save_id) fail(`état périmé: attendu ${payload.expected_current_save_id}, trouvé ${base.save_id}`);
  if (save.parent_save_id !== base.save_id) fail(`parent_save_id invalide: ${save.parent_save_id}; attendu ${base.save_id}`);
  if (save.turn !== base.turn + 1) fail(`turn invalide: ${save.turn}; attendu ${base.turn + 1}`);
  if (save.save_id !== base.next_expected_save?.save_id || save.save_id !== nextSaveId(base.save_id)) fail(`save_id invalide: ${save.save_id}`);
  if (base.next_expected_save.parent_save_id !== base.save_id || base.next_expected_save.turn !== base.turn + 1) fail("CURRENT distant: next_expected_save incohérent");
  if (save.fiction_advanced !== true) fail("un nouveau tour narratif doit avancer la fiction");
  if (typeof save.checkpoint_kind === "string" && save.checkpoint_kind.startsWith("technical")) fail("save_turn ne crée pas de checkpoint technique");
  eventTime(save.event_time, "save.event_time");
  instant(save.record_time, "save.record_time");

  if (current.save_id !== save.save_id || current.parent_save_id !== save.parent_save_id || current.turn !== save.turn) fail("current ne correspond pas à save");
  instant(current.record_time, "current.record_time");
  if (world.save_id !== save.save_id || world.turn !== save.turn || world.audience !== "player_visible") fail("world ne correspond pas au nouveau checkpoint joueur");
  if (hidden.save_id !== save.save_id || hidden.turn !== save.turn || hidden.audience !== "gm_only") fail("hidden ne correspond pas au nouveau checkpoint MJ");
  assertPlayerVisible(current, "current");
  assertPlayerVisible(world, "world");

  const next = fields(current.next_expected_save, ["save_id", "parent_save_id", "turn"], "current.next_expected_save");
  if (next.save_id !== nextSaveId(save.save_id) || next.parent_save_id !== save.save_id || next.turn !== save.turn + 1) fail("prochaine sauvegarde incohérente");

  if (!Array.isArray(payload.events) || payload.events.length === 0 || payload.events.length > 50) fail("events doit contenir entre 1 et 50 événements atomiques");
  const existingJournal = existingEventIds(existingEventsText || "");
  if (eventFileForTurn(base.turn) === eventFileForTurn(save.turn)) {
    const lastExisting = existingJournal.events.at(-1);
    if (!lastExisting || lastExisting.event_id !== base.last_event_id) {
      fail(`journal existant incohérent: dernier événement attendu ${base.last_event_id}`);
    }
  } else if (existingJournal.events.length > 0) {
    fail("le nouveau fichier de tranche événementielle doit être vide");
  }
  const eventIds = new Set();
  for (const [index, value] of payload.events.entries()) {
    const event = fields(value, ["event_id", "save_id", "parent_save_id", "turn", "event_time", "record_time"], `events[${index}]`);
    if (typeof event.event_id !== "string" || !event.event_id) fail(`events[${index}].event_id invalide`);
    if (existingJournal.ids.has(event.event_id)) fail(`event_id déjà présent dans le journal: ${event.event_id}`);
    if (eventIds.has(event.event_id)) fail(`event_id dupliqué dans le tour: ${event.event_id}`);
    eventIds.add(event.event_id);
    if (event.save_id !== save.save_id || event.parent_save_id !== save.parent_save_id || event.turn !== save.turn) fail(`${event.event_id}: filiation incohérente`);
    if (event.historical_reconstruction === true) fail(`${event.event_id}: un nouveau tour ne peut pas être une reconstruction historique`);
    eventTime(event.event_time, `${event.event_id}.event_time`);
    instant(event.record_time, `${event.event_id}.record_time`);
    assertPlayerVisible(event, event.event_id);
  }
  const lastEvent = payload.events[payload.events.length - 1];
  if (current.last_event_id !== lastEvent.event_id) fail("current.last_event_id ne correspond pas au dernier événement envoyé");

  const existing = existingEventsText && existingEventsText.endsWith("\n") ? existingEventsText : `${existingEventsText ?? ""}${existingEventsText ? "\n" : ""}`;
  const appendedEvents = `${existing}${payload.events.map((event) => JSON.stringify(event)).join("\n")}\n`;
  const files = {
    [`saves/${save.save_id}.yaml`]: jsonDocument(save),
    "state/CURRENT.yaml": jsonDocument(current),
    "state/WORLD.yaml": jsonDocument(world),
    "state/HIDDEN.yaml": jsonDocument(hidden),
    [eventFileForTurn(save.turn)]: appendedEvents,
  };
  const totalBytes = Object.values(files).reduce((total, text) => total + new TextEncoder().encode(text).byteLength, 0);
  if (totalBytes > 1_000_000) fail("transaction trop volumineuse (maximum 1 Mo)");

  return { files, saveId: save.save_id, turn: save.turn, eventCount: payload.events.length };
}

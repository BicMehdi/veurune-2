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

function synchronizedProjection(value, audience, saveId, turn) {
  return {
    ...object(value, audience),
    save_id: saveId,
    turn,
    audience,
  };
}

function chapterIdForTurn(turn) {
  const start = Math.floor(turn / 50) * 50;
  return {
    id: `CHAPTER-${String(start).padStart(4, "0")}-${String(start + 49).padStart(4, "0")}`,
    start,
    end: start + 49,
  };
}

function advanceNarrativeMemory(value, saveId, turn) {
  const memory = synchronizedProjection(value, "gm_only", saveId, turn);
  const chapter = chapterIdForTurn(turn);
  const chapters = Array.isArray(memory.chapters) ? [...memory.chapters] : [];
  if (!chapters.some((entry) => entry && entry.chapter_id === chapter.id)) {
    chapters.push({
      chapter_id: chapter.id,
      turn_start: chapter.start,
      turn_end: chapter.end,
      coverage_start: turn,
      status: "summary_due",
      event_file: eventFileForTurn(turn),
      summary: [],
      evidence_event_ids: [],
      unresolved_summary: [],
    });
  }
  return {
    ...memory,
    history_coverage: {
      ...(memory.history_coverage && typeof memory.history_coverage === "object" ? memory.history_coverage : {}),
      campaign_turns_known: turn,
    },
    chapters,
    rolling_index: {
      ...(memory.rolling_index && typeof memory.rolling_index === "object" ? memory.rolling_index : {}),
      current_chapter_id: chapter.id,
      next_summary_due_at_turn: chapter.end + 1,
      open_scene_resume_source: "state/CURRENT.yaml",
    },
  };
}

function advanceMehdiProfile(value, saveId, turn) {
  const profile = synchronizedProjection(value, "gm_only", saveId, turn);
  return {
    ...profile,
    history_coverage: {
      ...(profile.history_coverage && typeof profile.history_coverage === "object" ? profile.history_coverage : {}),
      known_campaign_length_turns: turn,
    },
  };
}

export function validateHiddenState(value, label = "HIDDEN") {
  const hidden = fields(value, ["save_id", "turn", "audience", "unresolved_secrets", "invented_secret_values"], label);
  if (hidden.audience !== "gm_only") fail(`${label}.audience doit valoir gm_only`);
  if (!Array.isArray(hidden.unresolved_secrets)) fail(`${label}.unresolved_secrets doit être un tableau`);
  const paths = new Set();
  for (const secret of hidden.unresolved_secrets) {
    const entry = fields(secret, ["path", "status", "value_known_to_persistence"], `${label}.unresolved_secrets`);
    if (typeof entry.path !== "string" || !entry.path || entry.status !== "unresolved_hidden" || entry.value_known_to_persistence !== false) {
      fail(`${label}: enregistrement secret non résolu invalide`);
    }
    if (paths.has(entry.path)) fail(`${label}: chemin secret dupliqué: ${entry.path}`);
    paths.add(entry.path);
  }
  if (!Array.isArray(hidden.invented_secret_values) || hidden.invented_secret_values.length !== 0) {
    fail(`${label}: invented_secret_values doit rester vide`);
  }
  return hidden;
}

export function validateMehdiSheet(value, label = "MEHDI_SHEET") {
  const sheet = fields(value, [
    "save_id", "turn", "audience", "authority", "ruleset", "formula",
    "endurance", "defense", "protection", "resolution", "capabilities", "masteries",
  ], label);
  if (sheet.audience !== "player_visible") fail(`${label}.audience doit valoir player_visible`);
  if (sheet.authority !== "current_mechanical_projection") fail(`${label}.authority invalide`);
  const endurance = fields(sheet.endurance, ["current", "max"], `${label}.endurance`);
  const resolution = fields(sheet.resolution, ["current", "max"], `${label}.resolution`);
  for (const [resource, record] of [["endurance", endurance], ["resolution", resolution]]) {
    if (!Number.isInteger(record.current) || !Number.isInteger(record.max) || record.current < 0 || record.max < 0 || record.current > record.max) {
      fail(`${label}.${resource}: valeurs courantes invalides`);
    }
  }
  for (const key of ["defense", "protection", "fatigue", "corruption"]) {
    if (key in sheet && (!Number.isInteger(sheet[key]) || sheet[key] < 0)) fail(`${label}.${key}: entier positif ou nul attendu`);
  }
  const capabilities = fields(sheet.capabilities, ["vigor", "address", "instinct", "reason", "will", "presence"], `${label}.capabilities`);
  for (const [key, score] of Object.entries(capabilities)) {
    if (!Number.isInteger(score) || score < 0 || score > 10) fail(`${label}.capabilities.${key}: score 0 à 10 attendu`);
  }
  const masteries = object(sheet.masteries, `${label}.masteries`);
  for (const [key, score] of Object.entries(masteries)) {
    if (!Number.isInteger(score) || score < 0 || score > 5) fail(`${label}.masteries.${key}: score 0 à 5 attendu`);
  }
  assertPlayerVisible(sheet, label);
  return sheet;
}

function assertHiddenRegistryPreserved(baseHiddenValue, nextHiddenValue) {
  const base = object(baseHiddenValue, "HIDDEN distant");
  const next = object(nextHiddenValue, "HIDDEN candidat");
  if (!Array.isArray(base.unresolved_secrets)) return;
  const nextPaths = new Set((Array.isArray(next.unresolved_secrets) ? next.unresolved_secrets : []).map((entry) => entry?.path));
  for (const entry of base.unresolved_secrets) {
    if (entry?.path && !nextPaths.has(entry.path)) {
      fail(`HIDDEN: suppression silencieuse interdite pour ${entry.path}`);
    }
  }
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

export function materializeTurnPayload(baseCurrentValue, baseWorldValue, baseHiddenValue, ...rest) {
  let baseProfileValue = {};
  let baseMemoryValue = {};
  let baseSheetValue = {};
  let payloadValue;
  const hasSheet = rest.length >= 4;
  if (rest.length === 1) [payloadValue] = rest;
  else if (rest.length === 3) [baseProfileValue, baseMemoryValue, payloadValue] = rest;
  else [baseProfileValue, baseMemoryValue, baseSheetValue, payloadValue] = rest;
  const payload = object(payloadValue, "save_turn");
  if (payload.mode !== "patch") {
    const full = fields(payload, ["save", "current", "world", "hidden", "events"], "save_turn full");
    const current = mergePatch(mergePatch(baseCurrentValue, full.save), full.current);
    const saveId = current.save_id;
    const turn = current.turn;
    return {
      ...full,
      save: current,
      current,
      world: synchronizedProjection(mergePatch(baseWorldValue, full.world), "player_visible", saveId, turn),
      hidden: synchronizedProjection(mergePatch(baseHiddenValue, full.hidden), "gm_only", saveId, turn),
      mehdi_profile: advanceMehdiProfile(mergePatch(baseProfileValue, full.mehdi_profile ?? {}), saveId, turn),
      narrative_memory: advanceNarrativeMemory(mergePatch(baseMemoryValue, full.narrative_memory ?? {}), saveId, turn),
      ...(hasSheet ? {
        mehdi_sheet: synchronizedProjection(mergePatch(baseSheetValue, full.mehdi_sheet ?? {}), "player_visible", saveId, turn),
      } : {}),
    };
  }

  const base = fields(baseCurrentValue, ["save_id", "turn", "next_expected_save"], "CURRENT distant");
  const fast = fields(payload, [
    "expected_head_sha", "expected_current_save_id", "save_id", "turn", "event_time", "record_time",
    "current_patch", "world_patch", "hidden_patch", "events",
  ], "save_turn patch");
  const currentPatch = rejectReservedKeys(fast.current_patch, CURRENT_SERVER_KEYS, "current_patch");
  const worldPatch = rejectReservedKeys(fast.world_patch, PROJECTION_SERVER_KEYS, "world_patch");
  const hiddenPatch = rejectReservedKeys(fast.hidden_patch, PROJECTION_SERVER_KEYS, "hidden_patch");
  const profilePatch = rejectReservedKeys(fast.mehdi_profile_patch ?? {}, PROJECTION_SERVER_KEYS, "mehdi_profile_patch");
  const memoryPatch = rejectReservedKeys(fast.narrative_memory_patch ?? {}, PROJECTION_SERVER_KEYS, "narrative_memory_patch");
  const sheetPatch = rejectReservedKeys(fast.mehdi_sheet_patch ?? {}, PROJECTION_SERVER_KEYS, "mehdi_sheet_patch");
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
  const mehdiProfile = advanceMehdiProfile(mergePatch(baseProfileValue, profilePatch), saveId, turn);
  const narrativeMemory = advanceNarrativeMemory(mergePatch(baseMemoryValue, memoryPatch), saveId, turn);
  const mehdiSheet = hasSheet
    ? synchronizedProjection(mergePatch(baseSheetValue, sheetPatch), "player_visible", saveId, turn)
    : null;
  return {
    expected_head_sha: fast.expected_head_sha,
    expected_current_save_id: fast.expected_current_save_id,
    save: current,
    current,
    world,
    hidden,
    mehdi_profile: mehdiProfile,
    narrative_memory: narrativeMemory,
    ...(mehdiSheet ? { mehdi_sheet: mehdiSheet } : {}),
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

export function validateTurnPayload(baseCurrentValue, existingEventsText, payloadValue, baseState = {}) {
  const base = fields(baseCurrentValue, ["save_id", "turn", "last_event_id", "next_expected_save"], "CURRENT distant");
  const payload = fields(payloadValue, ["expected_head_sha", "expected_current_save_id", "save", "current", "world", "hidden", "events"], "save_turn");
  const save = fields(payload.save, ["save_id", "parent_save_id", "turn", "event_time", "record_time", "fiction_advanced"], "save");
  const current = fields(payload.current, ["save_id", "parent_save_id", "turn", "record_time", "last_event_id", "next_expected_save"], "current");
  const world = fields(payload.world, ["save_id", "turn", "audience"], "world");
  const hidden = fields(payload.hidden, ["save_id", "turn", "audience"], "hidden");
  const mehdiProfile = payload.mehdi_profile
    ? fields(payload.mehdi_profile, ["save_id", "turn", "audience"], "mehdi_profile")
    : null;
  const narrativeMemory = payload.narrative_memory
    ? fields(payload.narrative_memory, ["save_id", "turn", "audience"], "narrative_memory")
    : null;
  const mehdiSheet = payload.mehdi_sheet
    ? validateMehdiSheet(payload.mehdi_sheet, "mehdi_sheet")
    : null;

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
  validateHiddenState(hidden, "hidden");
  if (baseState.hidden) assertHiddenRegistryPreserved(baseState.hidden, hidden);
  for (const [projection, label] of [[mehdiProfile, "mehdi_profile"], [narrativeMemory, "narrative_memory"]]) {
    if (projection && (projection.save_id !== save.save_id || projection.turn !== save.turn || projection.audience !== "gm_only")) {
      fail(`${label} ne correspond pas au nouveau checkpoint`);
    }
  }
  if (mehdiSheet && (mehdiSheet.save_id !== save.save_id || mehdiSheet.turn !== save.turn || mehdiSheet.audience !== "player_visible")) {
    fail("mehdi_sheet ne correspond pas au nouveau checkpoint");
  }
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
  if (mehdiProfile) files["state/MEHDI_PROFILE.yaml"] = jsonDocument(mehdiProfile);
  if (narrativeMemory) files["state/NARRATIVE_MEMORY.yaml"] = jsonDocument(narrativeMemory);
  if (mehdiSheet) files["state/MEHDI_SHEET.yaml"] = jsonDocument(mehdiSheet);
  const totalBytes = Object.values(files).reduce((total, text) => total + new TextEncoder().encode(text).byteLength, 0);
  if (totalBytes > 1_000_000) fail("transaction trop volumineuse (maximum 1 Mo)");

  return { files, saveId: save.save_id, turn: save.turn, eventCount: payload.events.length };
}

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const HIDDEN_KEYS = new Set(["hidden_state", "secrets", "private_agendas", "sealed_revelations", "gm_only"]);

function fail(message) {
  throw new Error(message);
}

export function parseYamlSubset(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${filePath}: YAML/JSON invalide (${error.message})`);
  }
}

function requireFields(record, fields, label) {
  for (const field of fields) {
    if (!(field in record)) fail(`${label}: champ obligatoire manquant: ${field}`);
  }
}

function validateInstant(value, label) {
  if (typeof value !== "string" || !ISO_INSTANT.test(value)) {
    fail(`${label}: date UTC ISO-8601 attendue`);
  }
}

function assertNoHiddenKeys(value, label, pathParts = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoHiddenKeys(entry, label, [...pathParts, index]));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (HIDDEN_KEYS.has(key)) fail(`${label}: clé MJ interdite dans un fichier visible: ${[...pathParts, key].join(".")}`);
    assertNoHiddenKeys(child, label, [...pathParts, key]);
  }
}

function expectedSaveId(turn) {
  return `VEY-${String(turn).padStart(4, "0")}`;
}

export function validateCandidate(current, candidate) {
  if (candidate.parent_save_id !== current.save_id) {
    fail(`parent_save_id invalide: ${candidate.parent_save_id}; attendu: ${current.save_id}`);
  }
  if (candidate.turn !== current.turn + 1) {
    fail(`turn invalide: ${candidate.turn}; attendu: ${current.turn + 1}`);
  }
  const expectedId = expectedSaveId(candidate.turn);
  if (candidate.save_id !== expectedId) {
    fail(`save_id invalide: ${candidate.save_id}; attendu: ${expectedId}`);
  }
}

export function validateRepository(rootDir) {
  const stateDir = path.join(rootDir, "state");
  const savesDir = path.join(rootDir, "saves");
  const eventsDir = path.join(rootDir, "events");
  const current = parseYamlSubset(path.join(stateDir, "CURRENT.yaml"));
  const world = parseYamlSubset(path.join(stateDir, "WORLD.yaml"));
  const hidden = parseYamlSubset(path.join(stateDir, "HIDDEN.yaml"));

  requireFields(current, ["save_id", "parent_save_id", "turn", "fiction_advanced", "record_time", "last_event_id", "next_expected_save"], "CURRENT");
  validateInstant(current.record_time, "CURRENT.record_time");
  assertNoHiddenKeys(current, "CURRENT");
  assertNoHiddenKeys(world, "WORLD");
  if (hidden.audience !== "gm_only") fail("HIDDEN.audience doit valoir gm_only");
  if (world.audience !== "player_visible") fail("WORLD.audience doit valoir player_visible");
  for (const projection of [[world, "WORLD"], [hidden, "HIDDEN"]]) {
    if (projection[0].save_id !== current.save_id || projection[0].turn !== current.turn) {
      fail(`${projection[1]} ne correspond pas à CURRENT`);
    }
  }

  const saveFiles = fs.readdirSync(savesDir).filter((name) => name.endsWith(".yaml")).sort();
  if (saveFiles.length === 0) fail("aucun checkpoint dans saves/");
  const saves = new Map();
  for (const name of saveFiles) {
    const save = parseYamlSubset(path.join(savesDir, name));
    requireFields(save, ["save_id", "parent_save_id", "turn", "event_time", "record_time", "fiction_advanced"], name);
    validateInstant(save.event_time, `${name}.event_time`);
    validateInstant(save.record_time, `${name}.record_time`);
    if (saves.has(save.save_id)) fail(`save_id dupliqué: ${save.save_id}`);
    saves.set(save.save_id, save);
  }

  for (const save of saves.values()) {
    if (save.parent_save_id === null) {
      if (!(save.save_id === "VEY-0719R" && save.turn === 719 && save.checkpoint_kind === "technical_recovery" && save.fiction_advanced === false)) {
        fail(`checkpoint racine non autorisé: ${save.save_id}`);
      }
      continue;
    }
    const parent = saves.get(save.parent_save_id);
    if (!parent) fail(`${save.save_id}: parent absent: ${save.parent_save_id}`);
    if (save.turn !== parent.turn + 1) fail(`${save.save_id}: turn doit valoir ${parent.turn + 1}`);
    if (save.save_id !== expectedSaveId(save.turn)) fail(`${save.save_id}: identifiant attendu: ${expectedSaveId(save.turn)}`);
  }

  const terminal = [...saves.values()].sort((a, b) => b.turn - a.turn)[0];
  if (current.save_id !== terminal.save_id || current.turn !== terminal.turn || current.parent_save_id !== terminal.parent_save_id) {
    fail("CURRENT ne correspond pas au checkpoint terminal");
  }
  validateCandidate(current, current.next_expected_save);

  const eventIds = new Set();
  let lastEvent = null;
  for (const name of fs.readdirSync(eventsDir).filter((entry) => entry.endsWith(".jsonl")).sort()) {
    const lines = fs.readFileSync(path.join(eventsDir, name), "utf8").split(/\r?\n/).filter(Boolean);
    for (let index = 0; index < lines.length; index += 1) {
      let event;
      try { event = JSON.parse(lines[index]); } catch (error) { fail(`${name}:${index + 1}: JSON invalide`); }
      requireFields(event, ["event_id", "save_id", "parent_save_id", "turn", "event_time", "record_time"], `${name}:${index + 1}`);
      validateInstant(event.event_time, `${event.event_id}.event_time`);
      validateInstant(event.record_time, `${event.event_id}.record_time`);
      if (eventIds.has(event.event_id)) fail(`event_id dupliqué: ${event.event_id}`);
      eventIds.add(event.event_id);
      const ownerSave = saves.get(event.save_id);
      if (!ownerSave) fail(`${event.event_id}: save_id inconnu: ${event.save_id}`);
      if (event.turn !== ownerSave.turn || event.parent_save_id !== ownerSave.parent_save_id) fail(`${event.event_id}: filiation incohérente avec ${event.save_id}`);
      if (event.historical_reconstruction === true) {
        if (event.reconstruction_status !== "partial") fail(`${event.event_id}: reconstruction historique non marquée partial`);
        if (!Array.isArray(event.attested_sources) || event.attested_sources.length === 0) fail(`${event.event_id}: source attestée obligatoire`);
      }
      assertNoHiddenKeys(event, event.event_id);
      lastEvent = event;
    }
  }
  if (!lastEvent || lastEvent.event_id !== current.last_event_id) fail("CURRENT.last_event_id ne correspond pas au dernier événement");
  return { current, saves: saves.size, events: eventIds.size };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const result = validateRepository(root);
    console.log(`Validation réussie: ${result.saves} sauvegarde(s), ${result.events} événement(s), état ${result.current.save_id}.`);
  } catch (error) {
    console.error(`Validation échouée: ${error.message}`);
    process.exitCode = 1;
  }
}

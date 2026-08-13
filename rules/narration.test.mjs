import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const narrationPath = new URL("./NARRATION_DARK_FANTASY.md", import.meta.url);
const projectSourcePath = new URL("../SYSTEM/CHATGPT_PROJECT_SOURCE.md", import.meta.url);
const workerIndexPath = new URL("../worker/src/index.ts", import.meta.url);
const evalsPath = new URL("./narration-evals.json", import.meta.url);
const profilePath = new URL("../state/MEHDI_PROFILE.yaml", import.meta.url);
const memoryPath = new URL("../state/NARRATIVE_MEMORY.yaml", import.meta.url);

test("les règles Dark Fantasy permanentes conservent les invariants du jeu", async () => {
  const text = await readFile(narrationPath, "utf8");

  for (const required of [
    "dark_fantasy_brutal_equilibre",
    "activation : permanente",
    "huit à douze paragraphes développés",
    "Le joueur autorise le MJ à faire parler et réagir Mehdi dans les échanges ordinaires",
    "Rendre immédiatement la main avant un engagement durable",
    "l'autorité finale du joueur sur Mehdi",
    "FER_NOIR_STRICT",
    "OOC: PAUSE",
    "limites de sécurité obligatoires de ChatGPT",
    "La violence sexuelle n'est jamais détaillée ni érotisée.",
    "Le tour a-t-il été sauvegardé avec succès",
  ]) {
    assert.ok(text.includes(required), `règle obligatoire absente: ${required}`);
  }
});

test("le bootstrap ChatGPT désigne GitHub main et load_game comme autorité", async () => {
  const text = await readFile(projectSourcePath, "utf8");

  assert.match(text, /branche `main`/);
  assert.match(text, /appeler `load_game`/);
  assert.match(text, /appliquer `persistence` et `narration_rules`/);
  assert.match(text, /appeler exactement une fois `save_turn`/);
  assert.match(text, /ne jamais restaurer automatiquement `VEY_SAVE_V1`/);
});

test("le document narratif est exposé par search et fetch", async () => {
  const text = await readFile(workerIndexPath, "utf8");

  assert.match(text, /narration: \{ title: "Règles permanentes de narration Dark Fantasy"/);
  assert.match(text, /path: "rules\/NARRATION_DARK_FANTASY.md"/);
  assert.match(text, /"search_master"/);
  assert.match(text, /"fetch_master_section"/);
  assert.match(text, /"check_save_status"/);
});

test("la matrice de délégation réserve toutes les décisions majeures au joueur", async () => {
  const fixtures = JSON.parse(await readFile(evalsPath, "utf8"));
  const delegable = fixtures.cases.filter((entry) => entry.expected === "delegable");
  const reserved = fixtures.cases.filter((entry) => entry.expected === "player_required");
  assert.ok(delegable.length >= 4);
  assert.ok(reserved.length >= 6);
  for (const id of ["accept-pact", "start-combat", "kill-captive", "betray-ally", "spend-fortune", "intimate-consent"]) {
    assert.equal(fixtures.cases.find((entry) => entry.id === id)?.expected, "player_required");
  }
});

test("le profil de Mehdi et la mémoire narrative restent descriptifs et sourcés", async () => {
  const profile = JSON.parse(await readFile(profilePath, "utf8"));
  const memory = JSON.parse(await readFile(memoryPath, "utf8"));
  assert.equal(profile.authority, "descriptive_only_player_final_authority");
  assert.equal(profile.delegation.major_choices_reserved_to_player, true);
  assert.ok(profile.observed_patterns.every((entry) => entry.evidence_event_ids.length > 0));
  assert.equal(memory.policy.event_log_remains_authoritative, true);
  assert.ok(memory.chapters.every((entry) => entry.evidence_event_ids.length > 0 || entry.status === "summary_due"));
});

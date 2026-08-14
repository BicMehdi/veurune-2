import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const narrationPath = new URL("./NARRATION_DARK_FANTASY.md", import.meta.url);
const projectSourcePath = new URL("../SYSTEM/CHATGPT_PROJECT_SOURCE.md", import.meta.url);
const workerIndexPath = new URL("../worker/src/index.ts", import.meta.url);
const evalsPath = new URL("./narration-evals.json", import.meta.url);
const profilePath = new URL("../state/MEHDI_PROFILE.yaml", import.meta.url);
const memoryPath = new URL("../state/NARRATIVE_MEMORY.yaml", import.meta.url);
const sheetPath = new URL("../state/MEHDI_SHEET.yaml", import.meta.url);
const mechanicsEvalsPath = new URL("./mechanics-evals.json", import.meta.url);
const mechanicalProfilesPath = new URL("../reference/MECHANICAL_PROFILES.json", import.meta.url);
const npcDesignRegistryPath = new URL("../reference/NPC_DESIGN_REGISTRY.json", import.meta.url);
const hiddenPath = new URL("../state/HIDDEN.yaml", import.meta.url);
const masterPath = new URL("../reference/VEY_RUNE_MASTER.md", import.meta.url);

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
    "Tout test a-t-il été validé et généré par `roll_check`",
    "🎲 Test — Intimidation",
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
  assert.match(text, /"roll_dice"/);
  assert.match(text, /"validate_check"/);
  assert.match(text, /"roll_check"/);
  assert.match(text, /signed_check/);
  assert.match(text, /outputSchema: rollCheckOutputSchema/);
  assert.match(text, /structuredContent/);
  assert.match(text, /compatibility_bridge/);
  assert.match(text, /runtimeManifest/);
  assert.match(text, /legacy five-tool bridge/i);
  assert.match(text, /state\/MEHDI_SHEET\.yaml/);
});

test("la fiche mécanique de Mehdi reste complète, visible et synchronisée", async () => {
  const sheet = JSON.parse(await readFile(sheetPath, "utf8"));
  assert.equal(sheet.audience, "player_visible");
  assert.equal(sheet.authority, "current_mechanical_projection");
  assert.deepEqual(sheet.endurance, { current: 8, max: 14 });
  assert.equal(sheet.defense, 13);
  assert.equal(sheet.capabilities.vigor, 5);
  assert.equal(sheet.masteries.athletics, 3);
  assert.equal(sheet.masteries.intimidation, 2);
  assert.equal(sheet.resources.personal_crowns, 246);
  assert.equal(sheet.resources.medicine, 2);
  assert.equal(sheet.mechanical_equipment.utility_knife.sheathed, true);
  assert.equal(sheet.mechanical_equipment.key_network_items.Veilleuse_copper_plate.known_use, "contact_signal_template");
  assert.equal(sheet.unresolved_split_with_Aveline.split_decided, false);
});

test("les dialogues ordinaires restent sans jet et les actions sociales à enjeu sont résolues", async () => {
  const fixtures = JSON.parse(await readFile(mechanicsEvalsPath, "utf8"));
  assert.equal(fixtures.cases.find((entry) => entry.id === "ask-ordinary-question")?.expected_roll, "none");
  assert.equal(fixtures.cases.find((entry) => entry.id === "detect-hidden-lie")?.expected_roll, "hidden_opposition");
  assert.equal(fixtures.cases.find((entry) => entry.id === "credible-threat")?.expected_roll, "public");
  assert.equal(fixtures.cases.find((entry) => entry.id === "intimacy-refusal")?.expected_roll, "forbidden");
  assert.ok(fixtures.cases.filter((entry) => entry.expected_roll === "public").length >= 4);
});

test("les huit profils génériques de PNJ restent bornés et non actifs par eux-mêmes", async () => {
  const catalog = JSON.parse(await readFile(mechanicalProfilesPath, "utf8"));
  const generic = Object.entries(catalog.profiles).filter(([id]) => id.startsWith("NPC-"));
  assert.equal(generic.length, 8);
  assert.equal(catalog.profiles["NPC-CIVIL-ORDINARY"].minimal_default_allowed, true);
  assert.ok(generic.filter(([id]) => id !== "NPC-CIVIL-ORDINARY").every(([, profile]) => profile.minimal_default_allowed === false));
  assert.ok(generic.every(([, profile]) => profile.fallback_assignable === true));
  assert.equal(catalog.profiles["NPC-WORKER-ROBUST"].mechanics.capabilities.vigor, 2);
  assert.equal(catalog.profiles["NPC-VETERAN"].mechanics.masteries.athletics, 3);
  assert.equal(catalog.profiles["NPC-COMBATANT-ELITE"].mechanics.defense, 15);
  assert.equal(catalog.profiles["NPC-MASTER-CHAMPION"].mechanics.defense, 16);
  assert.equal(catalog.profiles["NPC-MASTER-CHAMPION"].minimum_evidence_refs, 3);
  assert.equal(catalog.profiles["NPC-MASTER-CHAMPION"].hidden_conception_requires_registry_authorization, true);
  assert.match(catalog.policy, /avant le premier jet/);
});

test("P16 classe les PNJ par fonction sans présélectionner leur puissance", async () => {
  const registry = JSON.parse(await readFile(npcDesignRegistryPath, "utf8"));
  const master = await readFile(masterPath, "utf8");
  const source = await readFile(projectSourcePath, "utf8");
  assert.deepEqual(Object.keys(registry.classes), [
    "incidental", "established", "important", "mysterious", "important_mysterious",
  ]);
  const contact = registry.classifications["hidden:bridge_contact"];
  assert.equal(contact.npc_class, "important_mysterious");
  assert.equal(contact.classified_before_roll, true);
  assert.equal(contact.mechanical_profile_id, null);
  assert.ok(contact.criteria.includes("durable_consequence_capacity"));
  assert.ok(contact.criteria.includes("capabilities_unresolved"));
  assert.ok(!JSON.stringify(contact).includes("NPC-MASTER-CHAMPION"));
  assert.ok(master.includes("`MECH-NPC-FUNCTIONAL-CLASSIFICATION`"));
  assert.match(master, /ne lui attribue aujourd’hui aucun profil mécanique/);
  assert.match(source, /basis: hidden_conception/);
  assert.match(source, /reclassification ou réattribution/);
});

test("les onze fiches préparées de compagnons ne créent aucun état vivant", async () => {
  const catalog = JSON.parse(await readFile(mechanicalProfilesPath, "utf8"));
  const companions = Object.entries(catalog.profiles).filter(([id]) => id.startsWith("CHAR-"));
  assert.equal(companions.length, 11);
  assert.ok(companions.every(([, profile]) => profile.prepared_character_profile === true));
  assert.ok(companions.every(([, profile]) => profile.fallback_assignable === false));
  assert.ok(companions.every(([, profile]) => profile.activation_requires_live_github_instance === true));
  assert.equal(catalog.profiles["CHAR-AVELINE-SOR"].mechanics.endurance, 12);
  assert.deepEqual(catalog.profiles["CHAR-AVELINE-SOR"].mechanics.techniques, ["angle_vivant", "interception_d_amorce"]);
  assert.equal(catalog.profiles["CHAR-ALDREN-VAUL"].mechanics.masteries.melee, 5);
  assert.equal(catalog.profiles["CHAR-VAERA-NHAL"].mechanics.capabilities.presence, 5);
  assert.equal(catalog.profiles["CHAR-SIVE"].prepared_role, "éclaireuse, infiltratrice et agente de terrain");
  assert.equal(catalog.profiles["CHAR-SIVE"].mechanics.masteries.stealth, 4);
  assert.equal(catalog.profiles["CHAR-LYSA"].prepared_role, "soigneuse, observatrice et négociatrice");
  assert.equal(catalog.profiles["CHAR-LYSA"].mechanics.masteries.medecine, 4);
  assert.match(catalog.profiles["CHAR-LYSA"].identity_disambiguation, /distincte de Lysa Onne/);
  assert.equal(catalog.deferred_characters, undefined);
});

test("P15 prépare les fiches vivantes sans modifier l’état courant", async () => {
  const hidden = JSON.parse(await readFile(hiddenPath, "utf8"));
  const master = await readFile(masterPath, "utf8");
  const source = await readFile(projectSourcePath, "utf8");
  assert.equal(hidden.companion_sheets, undefined);
  assert.equal(hidden.companion_change_log, undefined);
  for (const id of ["COMP-LIVE-SHEETS", "COMP-CAUSAL-CHANGES", "COMP-RELATION-EMOTION", "COMP-NO-CURRENT-STATE-CREATED"]) {
    assert.ok(master.includes(`\`${id}\``), `section P15 absente: ${id}`);
  }
  assert.match(source, /companion_changes/);
  assert.match(source, /companion_refs/);
  assert.match(source, /OOC.*aucun tour/s);
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

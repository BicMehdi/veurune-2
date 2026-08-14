import test from "node:test";
import assert from "node:assert/strict";
import { applyCompanionPersistence } from "../src/companions.ts";
import { validateCheck } from "../src/checks.ts";

const catalog = {
  profiles: {
    "CHAR-AVELINE-SOR": {
      prepared_character_profile: true,
      canonical_actor_keys: ["Aveline_Sor"],
      mechanics: {
        endurance: 12,
        defense: 15,
        protection: 3,
        capabilities: { vigor: 2, address: 3, instinct: 2, reason: 1, will: 2, presence: 1 },
        masteries: { melee: 4, athletics: 3, vigilance: 3 },
        techniques: ["angle_vivant"],
      },
    },
  },
};

const baseHidden = {
  save_id: "VEY-0733",
  turn: 723,
  audience: "gm_only",
  unresolved_secrets: [],
  invented_secret_values: [],
};

const relation = {
  target_ref: "Mehdi",
  dimensions: { trust: 1, respect: 2, resentment: 0 },
  anchors: ["Mehdi a tenu sa parole."],
  promises: [],
  debts: [],
  limits: ["Ne pas sacrifier un innocent."],
  source_event_ids: ["EVT-0734-0001"],
};

test("crée une fiche vivante seulement depuis un changement causé et journalisé", () => {
  const hidden = applyCompanionPersistence(
    baseHidden,
    baseHidden,
    [{ event_id: "EVT-0734-0001", type: "relationship_change", companion_refs: ["CHAR-AVELINE-SOR"] }],
    [{
      change_id: "CHG-0734-AVELINE-REL-1",
      profile_id: "CHAR-AVELINE-SOR",
      character_key: "Aveline_Sor",
      domain: "relation",
      path: "relations.mehdi",
      operation: "set",
      before: null,
      after: relation,
      cause: "Une promesse tenue modifie sa lecture de Mehdi.",
      source_event_id: "EVT-0734-0001",
      duration: "durable",
    }],
    [],
    catalog,
    "VEY-0734",
    724,
  );
  const sheet = (hidden.companion_sheets as Record<string, any>)["CHAR-AVELINE-SOR"];
  assert.equal(sheet.authority, "live_github_companion_projection");
  assert.deepEqual(sheet.mechanics.endurance, { current: 12, max: 12 });
  assert.deepEqual(sheet.relations.mehdi, relation);
  assert.equal((hidden.companion_change_log as any[])[0].source_event_id, "EVT-0734-0001");
  assert.equal((hidden.companion_change_log as any[])[0].save_id, "VEY-0734");
});

test("refuse un changement sans événement, avec before faux ou une progression gonflée", () => {
  const common = {
    change_id: "CHG-X",
    profile_id: "CHAR-AVELINE-SOR",
    character_key: "Aveline_Sor",
    domain: "mechanics" as const,
    path: "mechanics.capabilities.vigor",
    operation: "set" as const,
    before: 2,
    after: 3,
    cause: "Entraînement joué.",
    source_event_id: "EVT-0734-0001",
    duration: "permanent" as const,
  };
  assert.throws(() => applyCompanionPersistence(baseHidden, baseHidden, [], [common], [], catalog, "VEY-0734", 724), /événement source absent/);
  assert.throws(() => applyCompanionPersistence(baseHidden, baseHidden, [{ event_id: "EVT-0734-0001" }], [common], [], catalog, "VEY-0734", 724), /companion_refs/);
  const events = [{ event_id: "EVT-0734-0001", companion_refs: ["CHAR-AVELINE-SOR"] }];
  assert.throws(() => applyCompanionPersistence(baseHidden, baseHidden, events, [{ ...common, before: 4 }], [], catalog, "VEY-0734", 724), /before incorrect/);
  assert.throws(() => applyCompanionPersistence(baseHidden, baseHidden, events, [{ ...common, after: 4 }], [], catalog, "VEY-0734", 724), /limitée à \+1/);
  assert.throws(() => applyCompanionPersistence(baseHidden, baseHidden, events, [{
    ...common,
    change_id: "CHG-ENDURANCE",
    path: "mechanics.endurance.current",
    before: 12,
    after: 13,
  }], [], catalog, "VEY-0734", 724), /supérieure au maximum/);
});

test("refuse toute modification directe du registre serveur", () => {
  assert.throws(() => applyCompanionPersistence(
    baseHidden,
    { ...baseHidden, companion_sheets: { forged: {} } },
    [{ event_id: "EVT-0734-0001" }],
    [],
    [],
    catalog,
    "VEY-0734",
    724,
  ), /gérés par le serveur/);
});

test("un premier jet signé active la fiche exacte et les jets suivants lisent son état vivant", () => {
  const hidden = applyCompanionPersistence(
    baseHidden,
    baseHidden,
    [{ event_id: "EVT-0734-0001", roll_id: "ROLL-1" }],
    [],
    [{
      target_ref: "hidden:Aveline_Sor",
      profile_id: "CHAR-AVELINE-SOR",
      locked_by_roll_id: "ROLL-1",
      assigned_in_save_id: "VEY-0734",
    }],
    catalog,
    "VEY-0734",
    724,
  );
  assert.equal((hidden.companion_change_log as any[])[0].domain, "activation");
  const validation = validateCheck({
    current: {},
    world: {},
    hidden,
    mehdiSheet: {},
    mechanicalProfiles: catalog,
  }, {
    actor_ref: "hidden:companion_sheets.CHAR-AVELINE-SOR",
    actor_visibility: "public",
    action: "parer",
    capability: "address",
    mastery: "melee",
    modifiers: [],
    profile_assignments: [],
    opposition: { kind: "difficulty", value: 15, visibility: "public", source: "adversaire" },
    expected_head_sha: "a".repeat(40),
    expected_save_id: "VEY-0735",
  });
  assert.equal(validation.status, "ready");
  if (validation.status === "ready") {
    assert.equal(validation.actor.capability.value, 3);
    assert.equal(validation.actor.mastery.value, 4);
  }
});

test("valide les émotions durables et les blessures avec leur preuve", () => {
  const changes = [{
    change_id: "CHG-EMO",
    profile_id: "CHAR-AVELINE-SOR",
    character_key: "Aveline_Sor",
    domain: "emotion" as const,
    path: "emotions.durable.mefiance",
    operation: "set" as const,
    before: null,
    after: { label: "méfiance", intensity: 3, source_event_ids: ["EVT-0734-0001"] },
    cause: "Un mensonge démontré.",
    source_event_id: "EVT-0734-0001",
    duration: "durable" as const,
  }, {
    change_id: "CHG-WOUND",
    profile_id: "CHAR-AVELINE-SOR",
    character_key: "Aveline_Sor",
    domain: "wound" as const,
    path: "wounds.bras_gauche",
    operation: "set" as const,
    before: null,
    after: { label: "entaille au bras gauche", severity: "moderate", status: "active", source_event_ids: ["EVT-0734-0001"] },
    cause: "Coup reçu pendant le combat.",
    source_event_id: "EVT-0734-0001",
    duration: "temporary" as const,
  }];
  const hidden = applyCompanionPersistence(baseHidden, baseHidden, [{ event_id: "EVT-0734-0001", companion_refs: ["CHAR-AVELINE-SOR"] }], changes, [], catalog, "VEY-0734", 724);
  const sheet = (hidden.companion_sheets as Record<string, any>)["CHAR-AVELINE-SOR"];
  assert.equal(sheet.emotions.durable.mefiance.intensity, 3);
  assert.equal(sheet.wounds.bras_gauche.status, "active");
});

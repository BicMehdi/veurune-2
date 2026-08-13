import assert from "node:assert/strict";
import test from "node:test";
import { issueMechanicalCheck, validateCheck, verifyEventCheckReceipts, verifyPersistedProfileAssignments } from "../src/checks.ts";
import type { CheckContext, CheckRequest } from "../src/checks.ts";

const HEAD = "a".repeat(40);
const SAVE_ID = "VEY-0734";
const SECRET = "test-check-receipt-key";

function context(hidden: Record<string, unknown> = {}, current: Record<string, unknown> = {}): CheckContext {
  return {
    current,
    world: {},
    hidden,
    mehdiSheet: {
      capabilities: { vigor: 5, presence: 1 },
      masteries: { athletics: 3, intimidation: 2 },
      defense: 13,
    },
    mechanicalProfiles: {
      profiles: {
        "BST-CHIEN-SUIE": { mechanics: { endurance: 8, defense: 12, protection: 1 } },
        "NPC-CIVIL-ORDINARY": {
          fallback_assignable: true, minimal_default_allowed: true,
          mechanics: { defense: 10, capabilities: { vigor: 0, address: 0 }, masteries: {} },
        },
        "NPC-WORKER-ROBUST": {
          fallback_assignable: true, minimal_default_allowed: false,
          mechanics: { defense: 10, capabilities: { vigor: 2, address: 0 }, masteries: { athletics: 2 } },
        },
        "NPC-VETERAN": {
          fallback_assignable: true, minimal_default_allowed: false,
          mechanics: { defense: 14, capabilities: { vigor: 3, address: 2 }, masteries: { athletics: 3 } },
        },
        "NPC-MASTER-CHAMPION": {
          fallback_assignable: true, minimal_default_allowed: false, minimum_evidence_refs: 3,
          mechanics: { defense: 16, capabilities: { vigor: 4, address: 4 }, masteries: { athletics: 5 } },
        },
        "CHAR-AVELINE-SOR": {
          fallback_assignable: false, prepared_character_profile: true,
          canonical_actor_keys: ["Aveline_Sor"], activation_requires_live_github_instance: true,
          mechanics: { defense: 15, capabilities: { vigor: 2, address: 3 }, masteries: { athletics: 3 } },
        },
      },
    },
  };
}

function request(overrides: Partial<CheckRequest> = {}): CheckRequest {
  return {
    actor_ref: "mehdi",
    actor_visibility: "public",
    action: "Maîtriser le contact",
    capability: "vigor",
    mastery: "athletics",
    modifiers: [{ id: "wound", label: "Blessure", value: -1, source: "state/MEHDI_SHEET.yaml#wounds" }],
    opposition: { kind: "difficulty", value: 15, visibility: "public", source: "RULE-NONLETHAL" },
    expected_head_sha: HEAD,
    expected_save_id: SAVE_ID,
    ...overrides,
  };
}

test("valide les statistiques de Mehdi sans lancer de dé", () => {
  const result = validateCheck(context(), request());
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.deepEqual(result.actor.capability, { id: "vigor", value: 5 });
  assert.deepEqual(result.actor.mastery, { id: "athletics", value: 3 });
  assert.equal(result.fiction_advanced, false);
});

test("résout et authentifie le calcul mécanique complet", async () => {
  const result = await issueMechanicalCheck(context(), request(), SECRET);
  const publicDisplay = result.public_display as Record<string, unknown>;
  assert.equal(publicDisplay.total, result.dice_total + 5 + 3 - 1);
  assert.equal(publicDisplay.margin, Number(publicDisplay.total) - 15);
  const event = {
    event_id: "EVT-0734-0001",
    roll_id: result.roll_id,
    notation: result.notation,
    dice: result.dice,
    dice_total: result.dice_total,
    roll_receipt: result.roll_receipt,
    mechanical_check: result.mechanical_check,
  };
  await assert.doesNotReject(() => verifyEventCheckReceipts([event], SECRET, HEAD, SAVE_ID));
  const altered = structuredClone(event) as Record<string, unknown>;
  (altered.mechanical_check as Record<string, unknown>).total = 99;
  await assert.rejects(() => verifyEventCheckReceipts([altered], SECRET, HEAD, SAVE_ID), /ne correspond pas/);
});

test("filtre l'opposition cachée et chiffre la résolution MJ", async () => {
  const hidden = { bridge_contact: { stats: { capabilities: { vigor: 2 }, masteries: { athletics: 1 }, defense: 14 } } };
  const result = await issueMechanicalCheck(context(hidden), request({
    opposition: { kind: "defense", target_ref: "hidden:bridge_contact", visibility: "hidden" },
  }), SECRET);
  const display = result.public_display as Record<string, unknown>;
  assert.deepEqual(display.opposition, { visibility: "hidden" });
  assert.equal(display.margin, "hidden_publicly");
  assert.equal(display.degree, "hidden_publicly");
  assert.ok(!result.roll_receipt.includes("bridge_contact"));
  assert.equal((result.gm_resolution.opposition as Record<string, unknown>).value, 14);
});

test("refuse une opposition non résolue avant tout jet", async () => {
  const hidden = {
    bridge_contact: {},
    unresolved_secrets: [{ path: "bridge_contact.stats", status: "unresolved_hidden", value_known_to_persistence: false }],
  };
  const check = request({ opposition: { kind: "defense", target_ref: "hidden:bridge_contact", visibility: "hidden" } });
  const validation = validateCheck(context(hidden), check);
  assert.equal(validation.status, "unresolved");
  if (validation.status === "unresolved") assert.equal(validation.code, "OPPOSITION_UNRESOLVED");
  await assert.rejects(() => issueMechanicalCheck(context(hidden), check, SECRET), /OPPOSITION_UNRESOLVED|ACTOR_UNRESOLVED/);
});

test("utilise un profil du Master seulement via une instance vivante", () => {
  const hidden = { soot_hound_1: { mechanical_profile_id: "BST-CHIEN-SUIE" } };
  const result = validateCheck(context(hidden), request({
    opposition: { kind: "defense", target_ref: "hidden:soot_hound_1", visibility: "public" },
  }));
  assert.equal(result.status, "ready");
  if (result.status === "ready") assert.equal((result.opposition as Record<string, unknown>).value, 12);
  const absent = validateCheck(context({}), request({
    opposition: { kind: "defense", target_ref: "hidden:soot_hound_1", visibility: "public" },
  }));
  assert.equal(absent.status, "unresolved");
});

test("verrouille avant le dé un profil générique justifié pour un PNJ sans fiche", async () => {
  const hidden = {
    bridge_contact: {},
    unresolved_secrets: [{ path: "bridge_contact.stats", status: "unresolved_hidden", value_known_to_persistence: false }],
  };
  const check = request({
    opposition: {
      kind: "derived", target_ref: "hidden:bridge_contact", base: 10,
      capability: "vigor", mastery: "athletics", visibility: "hidden",
    },
    profile_assignments: [{
      target_ref: "hidden:bridge_contact",
      profile_id: "NPC-WORKER-ROBUST",
      basis: "established_fiction",
      rationale: "Silhouette et travail physique explicitement établis avant le test.",
      evidence_refs: ["EVT-0733-0002"],
    }],
  });
  const validation = validateCheck(context(hidden), check);
  assert.equal(validation.status, "ready");
  const rolled = await issueMechanicalCheck(context(hidden), check, SECRET);
  assert.equal(rolled.required_profile_persistence.length, 1);
  assert.equal(rolled.required_profile_persistence[0].profile_id, "NPC-WORKER-ROBUST");
  assert.equal((rolled.gm_resolution.opposition as Record<string, unknown>).value, 14);
  assert.deepEqual((rolled.public_display as Record<string, unknown>).opposition, { visibility: "hidden" });
});

test("n'autorise comme défaut sans preuve que le civil ordinaire", () => {
  const hidden = {
    improvised_npc: {},
    unresolved_secrets: [{ path: "improvised_npc.stats", status: "unresolved_hidden", value_known_to_persistence: false }],
  };
  const invalid = validateCheck(context(hidden), request({
    opposition: { kind: "defense", target_ref: "hidden:improvised_npc", visibility: "hidden" },
    profile_assignments: [{
      target_ref: "hidden:improvised_npc", profile_id: "NPC-VETERAN", basis: "minimal_default",
      rationale: "Aucun fait ne permet de préciser davantage.", evidence_refs: ["current_scene:new_npc"],
    }],
  }));
  assert.equal(invalid.status, "unresolved");
  if (invalid.status === "unresolved") assert.equal(invalid.code, "PROFILE_ASSIGNMENT_INVALID");

  const valid = validateCheck(context(hidden), request({
    opposition: { kind: "defense", target_ref: "hidden:improvised_npc", visibility: "hidden" },
    profile_assignments: [{
      target_ref: "hidden:improvised_npc", profile_id: "NPC-CIVIL-ORDINARY", basis: "minimal_default",
      rationale: "Aucune compétence ou robustesse particulière n'est établie.", evidence_refs: ["current_scene:new_npc"],
    }],
  }));
  assert.equal(valid.status, "ready");
});

test("save_turn doit persister exactement l'attribution signée", async () => {
  const hidden = {
    bridge_contact: {},
    unresolved_secrets: [{ path: "bridge_contact.stats", status: "unresolved_hidden", value_known_to_persistence: false }],
  };
  const check = request({
    opposition: { kind: "defense", target_ref: "hidden:bridge_contact", visibility: "hidden" },
    profile_assignments: [{
      target_ref: "hidden:bridge_contact", profile_id: "NPC-WORKER-ROBUST", basis: "established_fiction",
      rationale: "Travail physique établi avant le jet.", evidence_refs: ["EVT-0733-0002"],
    }],
  });
  const rolled = await issueMechanicalCheck(context(hidden), check, SECRET);
  const event = {
    event_id: "EVT-0734-0001", roll_id: rolled.roll_id, notation: rolled.notation, dice: rolled.dice,
    dice_total: rolled.dice_total, roll_receipt: rolled.roll_receipt, mechanical_check: rolled.mechanical_check,
  };
  const required = await verifyEventCheckReceipts([event], SECRET, HEAD, SAVE_ID);
  assert.throws(() => verifyPersistedProfileAssignments(required, hidden, hidden), /doit persister exactement/);
  const assignment = required[0];
  const persisted = {
    ...hidden,
    bridge_contact: {
      mechanical_profile_id: assignment.profile_id,
      mechanical_profile_assignment: assignment,
    },
  };
  assert.doesNotThrow(() => verifyPersistedProfileAssignments(required, hidden, persisted));

  const laterContext = context(persisted);
  const later = validateCheck(laterContext, request({
    opposition: { kind: "defense", target_ref: "hidden:bridge_contact", visibility: "hidden" },
  }));
  assert.equal(later.status, "ready");
});

test("refuse une réattribution ultérieure ou un profil ajouté hors reçu", () => {
  const base = {
    bridge_contact: { mechanical_profile_id: "NPC-WORKER-ROBUST" },
  };
  assert.throws(() => verifyPersistedProfileAssignments([], base, {
    bridge_contact: { mechanical_profile_id: "NPC-VETERAN" },
  }), /réattribution/);
  assert.throws(() => verifyPersistedProfileAssignments([], {}, {
    stranger: { mechanical_profile_id: "NPC-VETERAN" },
  }), /non autorisé/);
});

test("un profil générique ne peut pas créer un PNJ absent du canon chargé", () => {
  const validation = validateCheck(context({}), request({
    opposition: { kind: "defense", target_ref: "hidden:invented_npc", visibility: "hidden" },
    profile_assignments: [{
      target_ref: "hidden:invented_npc", profile_id: "NPC-CIVIL-ORDINARY", basis: "minimal_default",
      rationale: "Aucune qualité particulière n'est établie.", evidence_refs: ["current_scene:invented_npc"],
    }],
  }));
  assert.equal(validation.status, "unresolved");
  if (validation.status === "unresolved") {
    assert.equal(validation.code, "PROFILE_ASSIGNMENT_INVALID");
    assert.match(validation.message, /ne peut pas créer un PNJ/);
  }
});

test("le maître champion exige trois preuves établies", () => {
  const hidden = { champion: {} };
  const assignment = {
    target_ref: "hidden:champion", profile_id: "NPC-MASTER-CHAMPION", basis: "established_fiction" as const,
    rationale: "Plusieurs exploits observés établissent une maîtrise exceptionnelle.",
  };
  const insufficient = validateCheck(context(hidden), request({
    opposition: { kind: "defense", target_ref: "hidden:champion", visibility: "hidden" },
    profile_assignments: [{ ...assignment, evidence_refs: ["EVT-1", "EVT-2"] }],
  }));
  assert.equal(insufficient.status, "unresolved");
  if (insufficient.status === "unresolved") assert.match(insufficient.message, /au moins 3 preuves/);

  const valid = validateCheck(context(hidden), request({
    opposition: { kind: "defense", target_ref: "hidden:champion", visibility: "hidden" },
    profile_assignments: [{ ...assignment, evidence_refs: ["EVT-1", "EVT-2", "EVT-3"] }],
  }));
  assert.equal(valid.status, "ready");
});

test("une fiche préparée nommée exige le bon acteur vivant", () => {
  const assignment = {
    profile_id: "CHAR-AVELINE-SOR", basis: "established_fiction" as const,
    rationale: "Aveline est présente et son identité est établie.", evidence_refs: ["EVT-0719R-0007"],
  };
  const valid = validateCheck(context({}, { Aveline_Sor: {} }), request({
    opposition: { kind: "defense", target_ref: "hidden:Aveline_Sor", visibility: "hidden" },
    profile_assignments: [{ ...assignment, target_ref: "hidden:Aveline_Sor" }],
  }));
  assert.equal(valid.status, "ready");

  const wrongActor = validateCheck(context({ stranger: {} }), request({
    opposition: { kind: "defense", target_ref: "hidden:stranger", visibility: "hidden" },
    profile_assignments: [{ ...assignment, target_ref: "hidden:stranger" }],
  }));
  assert.equal(wrongActor.status, "unresolved");
  if (wrongActor.status === "unresolved") assert.match(wrongActor.message, /ne correspond pas/);

  const absent = validateCheck(context({}), request({
    opposition: { kind: "defense", target_ref: "hidden:Aveline_Sor", visibility: "hidden" },
    profile_assignments: [{ ...assignment, target_ref: "hidden:Aveline_Sor" }],
  }));
  assert.equal(absent.status, "unresolved");
  if (absent.status === "unresolved") assert.match(absent.message, /ne peut pas créer un PNJ/);

  const forgedExisting = validateCheck(context({
    stranger: { mechanical_profile_id: "CHAR-AVELINE-SOR" },
  }), request({
    opposition: { kind: "defense", target_ref: "hidden:stranger", visibility: "hidden" },
  }));
  assert.equal(forgedExisting.status, "unresolved");
  if (forgedExisting.status === "unresolved") assert.match(forgedExisting.message, /ne correspond pas/);
});

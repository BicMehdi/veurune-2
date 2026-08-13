import assert from "node:assert/strict";
import test from "node:test";
import { issueMechanicalCheck, validateCheck, verifyEventCheckReceipts } from "../src/checks.ts";
import type { CheckContext, CheckRequest } from "../src/checks.ts";

const HEAD = "a".repeat(40);
const SAVE_ID = "VEY-0734";
const SECRET = "test-check-receipt-key";

function context(hidden: Record<string, unknown> = {}): CheckContext {
  return {
    current: {},
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

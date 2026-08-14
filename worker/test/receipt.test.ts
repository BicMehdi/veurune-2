import assert from "node:assert/strict";
import test from "node:test";
import { decryptJson, encryptJson } from "../src/receipt.ts";

const SECRET = "receipt-compatibility-test";
const DOMAIN = "veyrune:check-receipt:v1";

function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

async function legacyV1Receipt(value: unknown) {
  const derived = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${DOMAIN}:${SECRET}`),
  );
  const key = await crypto.subtle.importKey("raw", derived, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  ));
  return `v1.${base64Url(iv)}.${base64Url(ciphertext)}`;
}

test("compresse les reçus P16.1 avant chiffrement et les relit exactement", async () => {
  const payload = {
    kind: "mechanical_check",
    expected_head_sha: "a".repeat(40),
    required_profile_persistence: Array.from({ length: 8 }, () => ({
      target_ref: "hidden:bridge_contact",
      npc_class: "important_mysterious",
      rationale: "Rencontre préparée à conséquences durables et capacités volontairement non résolues.",
      evidence_refs: ["state/CURRENT.yaml#open_threads", "reference/NPC_DESIGN_REGISTRY.json"],
    })),
  };
  const receipt = await encryptJson(payload, SECRET, DOMAIN);
  assert.match(receipt, /^v2\./);
  assert.ok(receipt.length < JSON.stringify(payload).length / 2);
  assert.deepEqual(await decryptJson(receipt, SECRET, DOMAIN), payload);
});

test("continue de relire les reçus chiffrés v1 déjà émis", async () => {
  const payload = { kind: "mechanical_check", roll_id: "legacy-roll", dice: [4, 7] };
  const receipt = await legacyV1Receipt(payload);
  assert.deepEqual(await decryptJson(receipt, SECRET, DOMAIN), payload);
});

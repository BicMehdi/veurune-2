import assert from "node:assert/strict";
import test from "node:test";
import { compatibilityToolHelp, parseCompatibilitySearch, runtimeManifest } from "../src/catalog.ts";

test("annonce le catalogue P16 complet même à un ancien client", () => {
  const manifest = runtimeManifest();
  assert.equal(manifest.runtime.worker_version, "1.9.2");
  assert.equal(manifest.runtime.api_schema_version, "P16.2");
  assert.deepEqual(manifest.capabilities.actions, [
    "search", "fetch", "load_game", "roll_dice", "validate_check", "roll_check",
    "search_master", "fetch_master_section", "save_turn", "check_save_status", "check_health",
  ]);
  assert.equal(manifest.capabilities.features.signed_checks, true);
  assert.equal(manifest.capabilities.features.signed_hidden_redactions, true);
  assert.equal(manifest.capabilities.features.npc_functional_classification, true);
  assert.equal(manifest.capabilities.features.gm_hidden_profile_choice, true);
  assert.equal(manifest.capabilities.features.structured_check_handoff, true);
  assert.equal(manifest.capabilities.features.compressed_check_receipts, true);
  assert.equal(manifest.capabilities.features.public_perceptible_difficulty_class, true);
  assert.equal(manifest.capabilities.features.companion_changes, true);
  assert.equal(manifest.capabilities.features.legacy_five_tool_bridge, true);
});

test("transforme les outils absents du vieux catalogue en commandes search/fetch", () => {
  assert.deepEqual(parseCompatibilitySearch("capabilities"), { operation: "capabilities", payload: {} });
  assert.deepEqual(parseCompatibilitySearch("doctor"), { operation: "doctor", payload: {} });
  assert.deepEqual(parseCompatibilitySearch("roll_check"), { operation: "tool_help", payload: { action: "roll_check" } });
  assert.deepEqual(parseCompatibilitySearch("search_master immobilisation physique"), {
    operation: "search_master", payload: { query: "immobilisation physique" },
  });
  assert.deepEqual(parseCompatibilitySearch("fetch_master_section TURN-RESOLVE"), {
    operation: "fetch_master_section", payload: { id: "TURN-RESOLVE" },
  });
  assert.deepEqual(parseCompatibilitySearch("check_save_status VEY-0734 EVT-0734-0002"), {
    operation: "check_save_status", payload: { save_id: "VEY-0734", expected_event_id: "EVT-0734-0002" },
  });
});

test("explique honnêtement les limites du catalogue historique", () => {
  const rollHelp = compatibilityToolHelp("roll_check");
  assert.equal(rollHelp.registered_on_worker, true);
  assert.equal(rollHelp.legacy_access.direct_if_five_tool_catalog, false);
  assert.equal(rollHelp.legacy_access.through_search_fetch, true);
  assert.match(rollHelp.usage, /signed_check/);

  const saveHelp = compatibilityToolHelp("save_turn");
  assert.equal(saveHelp.legacy_access.direct_if_five_tool_catalog, true);
  assert.equal(saveHelp.legacy_access.through_search_fetch, false);
  assert.match(saveHelp.usage, /Rafraîchir le catalogue/);
});

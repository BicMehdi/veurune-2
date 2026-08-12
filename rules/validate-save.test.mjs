import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseYamlSubset, validateCandidate, validateRepository } from "./validate-save.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repository = validateRepository(root);
const importedCurrent = repository.current;
const importedHidden = repository.hidden;
const importedSave = parseYamlSubset(path.join(root, "saves", "VEY-0719R.yaml"));

const current = {
  save_id: "VEY-0719R",
  turn: 709,
  next_expected_save: {
    save_id: "VEY-0720",
    parent_save_id: "VEY-0719R",
    turn: 710
  }
};

test("régression: accepte VEY-0719R turn 709 vers VEY-0720 turn 710", () => {
  assert.doesNotThrow(() => validateCandidate(current, {
    save_id: "VEY-0720",
    parent_save_id: "VEY-0719R",
    turn: 710
  }));
});

test("refuse un parent différent de l’état courant", () => {
  assert.throws(() => validateCandidate(current, {
    save_id: "VEY-0720",
    parent_save_id: "VEY-0719",
    turn: 710
  }), /parent_save_id invalide/);
});

test("refuse un tour qui ne suit pas l’état courant", () => {
  assert.throws(() => validateCandidate(current, {
    save_id: "VEY-0720",
    parent_save_id: "VEY-0719R",
    turn: 711
  }), /turn invalide/);
});

test("refuse un identifiant autre que VEY-0720", () => {
  assert.throws(() => validateCandidate(current, {
    save_id: "VEY-0720-BIS",
    parent_save_id: "VEY-0719R",
    turn: 710
  }), /save_id invalide/);
});

test("ne déduit jamais save_id depuis turn", () => {
  const offsetCurrent = {
    save_id: "VEY-0800",
    turn: 725,
    next_expected_save: {
      save_id: "VEY-0801",
      parent_save_id: "VEY-0800",
      turn: 726
    }
  };
  assert.doesNotThrow(() => validateCandidate(offsetCurrent, {
    save_id: "VEY-0801",
    parent_save_id: "VEY-0800",
    turn: 726
  }));
});

test("CURRENT est chargé depuis la capsule attestée", () => {
  assert.notEqual(importedCurrent.scene.status, "not_loaded");
  assert.notEqual(importedCurrent.player_state.status, "pending_attested_source");
  assert.equal(importedCurrent.player_state.status, "loaded_from_attested_capsule");
});

test("la scène canonique est le Pont des Trois Chaînes à 01:24", () => {
  assert.deepEqual(importedCurrent.time, { year: 347, day: 513, clock: "01:24" });
  assert.equal(importedCurrent.scene.region, "Valdorne");
  assert.equal(importedCurrent.scene.district, "Pont_des_Trois_Chaines");
  assert.equal(importedCurrent.scene.location, "culee_est");
  assert.equal(importedCurrent.scene.meeting_active, true);
});

test("Mehdi conserve 8/14 Endurance", () => {
  assert.deepEqual(importedCurrent.Mehdi.endurance, { current: 8, max: 14 });
});

test("Aveline conserve 11/12 Endurance", () => {
  assert.deepEqual(importedCurrent.Aveline.endurance, { current: 11, max: 12 });
});

test("l’identité du contact reste non résolue", () => {
  assert.equal(importedCurrent.bridge_contact.identity_resolution.status, "unresolved");
  assert.equal(importedCurrent.bridge_contact.identity_resolution.contact_is_Meren, false);
  assert.equal(importedCurrent.bridge_contact.identity_resolution.contact_is_not_Meren, false);
  assert.equal(importedCurrent.bridge_contact.identity_resolution.reliable_conclusion_available, false);
});

test("aucun secret hidden ne reçoit de valeur inventée", () => {
  assert.ok(importedHidden.unresolved_secrets.length > 0);
  assert.deepEqual(importedHidden.invented_secret_values, []);
  for (const secret of importedHidden.unresolved_secrets) {
    assert.equal(secret.status, "unresolved_hidden");
    assert.equal(secret.value_known_to_persistence, false);
    assert.equal(secret.source, "VEY-0719 marks this information as hidden");
  }
});

test("VEY-0719R reste un checkpoint technique au tour 709", () => {
  assert.equal(importedSave.save_id, "VEY-0719R");
  assert.equal(importedSave.recovery_of_save_id, "VEY-0719");
  assert.equal(importedSave.turn, 709);
  assert.equal(importedSave.fiction_advanced, false);
});

test("la prochaine sauvegarde reste VEY-0720 parent VEY-0719R tour 710", () => {
  assert.deepEqual(importedCurrent.next_expected_save, {
    save_id: "VEY-0720",
    parent_save_id: "VEY-0719R",
    turn: 710
  });
});

test("la provenance canonique atteste un snapshot complet et un historique partiel", () => {
  assert.deepEqual(importedSave.canonical_source, {
    type: "player_supplied_save_capsule",
    save_id: "VEY-0719",
    canonical: true,
    completeness: "snapshot_complete_event_history_partial"
  });
  assert.equal(repository.events, 8);
});

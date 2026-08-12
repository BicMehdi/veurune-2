import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseYamlSubset, validateCandidate, validateRepository } from "./validate-save.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repository = validateRepository(root);
const importedCurrent = repository.current;
const importedHidden = repository.hidden;
const importedSave = parseYamlSubset(path.join(root, "saves", "VEY-0719R.yaml"));
const importedEvents = fs.readFileSync(path.join(root, "events", "0700-0799.jsonl"), "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

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

test("le checkpoint de récupération conserve le Pont des Trois Chaînes à 01:24", () => {
  assert.deepEqual(importedSave.time, { year: 347, day: 513, clock: "01:24" });
  assert.equal(importedSave.scene.region, "Valdorne");
  assert.equal(importedSave.scene.district, "Pont_des_Trois_Chaines");
  assert.equal(importedSave.scene.location, "culee_est");
  assert.equal(importedSave.scene.meeting_active, true);
});

test("le checkpoint de récupération conserve Mehdi à 8/14 Endurance", () => {
  assert.deepEqual(importedSave.Mehdi.endurance, { current: 8, max: 14 });
});

test("le checkpoint de récupération conserve Aveline à 11/12 Endurance", () => {
  assert.deepEqual(importedSave.Aveline_Sor.endurance, { current: 11, max: 12 });
});

test("le checkpoint de récupération ne tranche pas l’identité du contact", () => {
  assert.deepEqual(importedSave.bridge_contact.identity.whether_Meren, {
    status: "unresolved_hidden",
    value_known_to_persistence: false,
    source: "VEY-0719 marks this information as hidden"
  });
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

test("le checkpoint de récupération désigne VEY-0720 comme successeur initial", () => {
  assert.deepEqual(importedSave.next_expected_save, {
    save_id: "VEY-0720",
    parent_save_id: "VEY-0719R",
    turn: 710
  });
});

test("CURRENT vivant accepte toujours son prochain successeur déclaré", () => {
  assert.doesNotThrow(() => validateCandidate(importedCurrent, importedCurrent.next_expected_save));
  assert.ok(fs.existsSync(path.join(root, "saves", `${importedCurrent.save_id}.yaml`)));
});

test("la provenance canonique atteste un snapshot complet et un historique partiel", () => {
  assert.deepEqual(importedSave.canonical_source, {
    type: "player_supplied_save_capsule",
    save_id: "VEY-0719",
    canonical: true,
    completeness: "snapshot_complete_event_history_partial"
  });
  const recoveryEvents = importedEvents.filter((event) => event.save_id === "VEY-0719R");
  assert.equal(recoveryEvents.length, 8);
  assert.ok(repository.events >= recoveryEvents.length);
});

import assert from "node:assert/strict";
import test from "node:test";
import { validateCandidate } from "./validate-save.mjs";

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

import assert from "node:assert/strict";
import test from "node:test";
import { validateCandidate } from "./validate-save.mjs";

const current = { save_id: "VEY-0719R", turn: 719 };

test("accepte VEY-0720 avec le bon parent et le bon tour", () => {
  assert.doesNotThrow(() => validateCandidate(current, {
    save_id: "VEY-0720",
    parent_save_id: "VEY-0719R",
    turn: 720
  }));
});

test("refuse un parent différent de l’état courant", () => {
  assert.throws(() => validateCandidate(current, {
    save_id: "VEY-0720",
    parent_save_id: "VEY-0719",
    turn: 720
  }), /parent_save_id invalide/);
});

test("refuse un tour qui ne suit pas l’état courant", () => {
  assert.throws(() => validateCandidate(current, {
    save_id: "VEY-0721",
    parent_save_id: "VEY-0719R",
    turn: 721
  }), /turn invalide/);
});

test("refuse un identifiant autre que VEY-0720", () => {
  assert.throws(() => validateCandidate(current, {
    save_id: "VEY-0720-BIS",
    parent_save_id: "VEY-0719R",
    turn: 720
  }), /save_id invalide/);
});

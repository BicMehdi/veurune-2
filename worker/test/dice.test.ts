import assert from "node:assert/strict";
import test from "node:test";
import { rollDice } from "../src/dice.ts";

test("génère des dés bornés sans avancer la fiction", () => {
  for (let index = 0; index < 100; index += 1) {
    const result = rollDice(2, 10, "test");
    assert.equal(result.notation, "2d10");
    assert.equal(result.dice.length, 2);
    assert.ok(result.dice.every((die) => Number.isInteger(die) && die >= 1 && die <= 10));
    assert.equal(result.dice_total, result.dice[0] + result.dice[1]);
    assert.equal(result.fiction_advanced, false);
    assert.match(result.roll_id, /^[0-9a-f-]{36}$/i);
  }
});

test("refuse les demandes de dés hors limites", () => {
  assert.throws(() => rollDice(0, 10), /count/);
  assert.throws(() => rollDice(2, 1), /sides/);
  assert.throws(() => rollDice(11, 10), /count/);
  assert.throws(() => rollDice(2, 101), /sides/);
});

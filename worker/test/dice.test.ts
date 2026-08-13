import assert from "node:assert/strict";
import test from "node:test";
import { issueDiceRoll, rollDice, verifyEventRollReceipts } from "../src/dice.ts";

const HEAD = "a".repeat(40);
const SAVE_ID = "VEY-0734";
const SECRET = "test-receipt-key";

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

test("signe un jet et valide sa copie exacte dans un événement", async () => {
  const roll = await issueDiceRoll(2, 10, "Intimidation", HEAD, SAVE_ID, SECRET);
  const event = {
    event_id: "EVT-0734-0001",
    roll_id: roll.roll_id,
    notation: roll.notation,
    dice: roll.dice,
    dice_total: roll.dice_total,
    roll_receipt: roll.roll_receipt,
  };
  await assert.doesNotReject(() => verifyEventRollReceipts([event], SECRET, HEAD, SAVE_ID));
});

test("refuse un dé modifié ou un reçu réutilisé pour un autre tour", async () => {
  const roll = await issueDiceRoll(2, 10, "Vigilance", HEAD, SAVE_ID, SECRET);
  const event = {
    event_id: "EVT-0734-0001",
    roll_id: roll.roll_id,
    notation: roll.notation,
    dice: [...roll.dice],
    dice_total: roll.dice_total,
    roll_receipt: roll.roll_receipt,
  };
  event.dice[0] = event.dice[0] === 10 ? 9 : event.dice[0] + 1;
  await assert.rejects(() => verifyEventRollReceipts([event], SECRET, HEAD, SAVE_ID), /ne correspond pas/);
  event.dice = [...roll.dice];
  await assert.rejects(() => verifyEventRollReceipts([event], SECRET, HEAD, "VEY-0735"), /ne correspond pas/);
});

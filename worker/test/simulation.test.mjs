import assert from "node:assert/strict";
import test from "node:test";
import { eventFileForTurn, nextSaveId, validateTurnPayload } from "../src/validation.mjs";

const HEAD = "a".repeat(40);
const RECORD_TIME = "2026-08-12T12:00:00Z";

function eventId(saveId) {
  return `EVT-${saveId.slice(4)}-SIM-0001`;
}

function nextExpected(saveId, turn) {
  return {
    save_id: nextSaveId(saveId),
    parent_save_id: saveId,
    turn: turn + 1,
  };
}

function payloadFor(base) {
  const saveId = nextSaveId(base.save_id);
  const turn = base.turn + 1;
  const id = eventId(saveId);
  const eventTime = { year: 347, day: 513, clock: "01:25" };
  const save = {
    save_id: saveId,
    parent_save_id: base.save_id,
    turn,
    event_time: eventTime,
    record_time: RECORD_TIME,
    fiction_advanced: true,
  };
  return {
    expected_head_sha: HEAD,
    expected_current_save_id: base.save_id,
    save,
    current: {
      ...save,
      last_event_id: id,
      next_expected_save: nextExpected(saveId, turn),
    },
    world: { save_id: saveId, turn, audience: "player_visible" },
    hidden: { save_id: saveId, turn, audience: "gm_only", unresolved_secrets: [], invented_secret_values: [] },
    events: [{
      event_id: id,
      save_id: saveId,
      parent_save_id: base.save_id,
      turn,
      event_time: eventTime,
      record_time: RECORD_TIME,
      type: "simulation_only",
    }],
  };
}

test("simule 200 sauvegardes consécutives sans toucher au canon", () => {
  let base = {
    save_id: "VEY-0719R",
    turn: 709,
    last_event_id: "EVT-0719R-0008",
    next_expected_save: { save_id: "VEY-0720", parent_save_id: "VEY-0719R", turn: 710 },
  };
  const journals = new Map([
    ["events/0700-0799.jsonl", '{"event_id":"EVT-0719R-0008"}\n'],
  ]);
  const savePaths = new Set();

  for (let index = 0; index < 200; index += 1) {
    const payload = payloadFor(base);
    const eventPath = eventFileForTurn(payload.save.turn);
    const result = validateTurnPayload(base, journals.get(eventPath) || "", payload);

    assert.equal(result.saveId, payload.save.save_id);
    assert.equal(result.turn, payload.save.turn);
    assert.equal(result.eventCount, 1);
    assert.ok(result.files[`saves/${result.saveId}.yaml`]);
    assert.ok(!savePaths.has(`saves/${result.saveId}.yaml`));

    savePaths.add(`saves/${result.saveId}.yaml`);
    journals.set(eventPath, result.files[eventPath]);
    base = payload.current;
  }

  assert.equal(savePaths.size, 200);
  assert.equal(base.save_id, "VEY-0919");
  assert.equal(base.turn, 909);
  assert.deepEqual(base.next_expected_save, {
    save_id: "VEY-0920",
    parent_save_id: "VEY-0919",
    turn: 910,
  });
  assert.deepEqual([...journals.keys()], [
    "events/0700-0799.jsonl",
    "events/0800-0899.jsonl",
    "events/0900-0999.jsonl",
  ]);
  assert.equal(journals.get("events/0700-0799.jsonl").trim().split("\n").length, 91);
  assert.equal(journals.get("events/0800-0899.jsonl").trim().split("\n").length, 100);
  assert.equal(journals.get("events/0900-0999.jsonl").trim().split("\n").length, 10);
});

test("refuse deux simulations concurrentes fondées sur le même CURRENT", () => {
  const base = {
    save_id: "VEY-0719R",
    turn: 709,
    last_event_id: "EVT-0719R-0008",
    next_expected_save: { save_id: "VEY-0720", parent_save_id: "VEY-0719R", turn: 710 },
  };
  const first = payloadFor(base);
  const journal = '{"event_id":"EVT-0719R-0008"}\n';
  const committed = validateTurnPayload(base, journal, first);
  const updatedBase = first.current;
  const updatedJournal = committed.files["events/0700-0799.jsonl"];
  const staleSecond = payloadFor(base);

  assert.throws(
    () => validateTurnPayload(updatedBase, updatedJournal, staleSecond),
    /état périmé/,
  );
});

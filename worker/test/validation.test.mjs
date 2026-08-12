import assert from "node:assert/strict";
import test from "node:test";
import { eventFileForTurn, nextSaveId, validateTurnPayload } from "../src/validation.mjs";

const timestamp = "2026-08-12T12:00:00Z";

function fixture() {
  const base = {
    save_id: "VEY-0719R",
    turn: 709,
    last_event_id: "EVT-0719R-0008",
    next_expected_save: { save_id: "VEY-0720", parent_save_id: "VEY-0719R", turn: 710 },
  };
  const save = {
    save_id: "VEY-0720",
    parent_save_id: "VEY-0719R",
    turn: 710,
    event_time: { year: 347, day: 513, clock: "01:25" },
    record_time: timestamp,
    fiction_advanced: true,
  };
  const event = {
    event_id: "EVT-0720-0001",
    save_id: "VEY-0720",
    parent_save_id: "VEY-0719R",
    turn: 710,
    event_time: { year: 347, day: 513, clock: "01:25" },
    record_time: timestamp,
    type: "dialogue",
  };
  return {
    base,
    payload: {
      expected_head_sha: "a".repeat(40),
      expected_current_save_id: "VEY-0719R",
      save,
      current: {
        ...save,
        last_event_id: event.event_id,
        next_expected_save: { save_id: "VEY-0721", parent_save_id: "VEY-0720", turn: 711 },
      },
      world: { save_id: "VEY-0720", turn: 710, audience: "player_visible" },
      hidden: { save_id: "VEY-0720", turn: 710, audience: "gm_only", unresolved_secrets: [] },
      events: [event],
    },
  };
}

test("la séquence de sauvegarde reste indépendante du tour", () => {
  assert.equal(nextSaveId("VEY-0719R"), "VEY-0720");
  assert.equal(eventFileForTurn(710), "events/0700-0799.jsonl");
});

test("accepte VEY-0719R tour 709 vers VEY-0720 tour 710", () => {
  const { base, payload } = fixture();
  const result = validateTurnPayload(base, '{"event_id":"EVT-0719R-0008"}\n', payload);
  assert.equal(result.saveId, "VEY-0720");
  assert.equal(result.turn, 710);
  assert.equal(result.eventCount, 1);
  assert.match(result.files["events/0700-0799.jsonl"], /EVT-0720-0001/);
});

test("refuse un parent périmé", () => {
  const { base, payload } = fixture();
  payload.save.parent_save_id = "VEY-0719";
  assert.throws(() => validateTurnPayload(base, "", payload), /parent_save_id invalide/);
});

test("refuse un secret dans la projection joueur", () => {
  const { base, payload } = fixture();
  payload.world.contact = { status: "unresolved_hidden" };
  assert.throws(() => validateTurnPayload(base, "", payload), /état MJ interdit/);
});

test("refuse une reconstruction historique injectée comme nouveau tour", () => {
  const { base, payload } = fixture();
  payload.events[0].historical_reconstruction = true;
  assert.throws(() => validateTurnPayload(base, "", payload), /ne peut pas être une reconstruction/);
});

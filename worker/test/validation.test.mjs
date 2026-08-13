import assert from "node:assert/strict";
import test from "node:test";
import { eventFileForTurn, materializeTurnPayload, nextSaveId, validateTurnPayload } from "../src/validation.mjs";

const timestamp = "2026-08-12T12:00:00Z";

test("materialise un patch compact sans perdre les donnees inchangees", () => {
  const base = {
    save_id: "VEY-0719R",
    turn: 709,
    last_event_id: "EVT-0719R-0008",
    next_expected_save: { save_id: "VEY-0720", parent_save_id: "VEY-0719R", turn: 710 },
    scene: { location: "bridge", tension: "high", weather: { rain: true, wind: "low" } },
    stale: "remove-me",
  };
  const patch = {
    mode: "patch",
    expected_head_sha: "a".repeat(40),
    expected_current_save_id: "VEY-0719R",
    save_id: "VEY-0720",
    turn: 710,
    event_time: { year: 347, day: 513, clock: "01:26" },
    record_time: timestamp,
    current_patch: { scene: { weather: { wind: "strong" } }, stale: null },
    world_patch: { district: { alert: "high" } },
    hidden_patch: { antagonist: { clock: 2 } },
    events: [{ event_id: "EVT-0720-0001", type: "dialogue" }],
  };
  const world = { save_id: "VEY-0719R", turn: 709, audience: "player_visible", district: { name: "Fours", alert: "low" } };
  const hidden = { save_id: "VEY-0719R", turn: 709, audience: "gm_only", antagonist: { name: "M", clock: 1 } };

  const materialized = materializeTurnPayload(base, world, hidden, patch);
  assert.deepEqual(materialized.current.scene, {
    location: "bridge",
    tension: "high",
    weather: { rain: true, wind: "strong" },
  });
  assert.ok(!("stale" in materialized.current));
  assert.deepEqual(materialized.world.district, { name: "Fours", alert: "high" });
  assert.deepEqual(materialized.hidden.antagonist, { name: "M", clock: 2 });
  assert.equal(materialized.save, materialized.current);
  assert.deepEqual(materialized.events[0], {
    event_id: "EVT-0720-0001",
    type: "dialogue",
    save_id: "VEY-0720",
    parent_save_id: "VEY-0719R",
    turn: 710,
    event_time: { year: 347, day: 513, clock: "01:26" },
    record_time: timestamp,
  });
  assert.doesNotThrow(() => validateTurnPayload(base, '{"event_id":"EVT-0719R-0008"}\n', materialized));
});

test("refuse les champs de continuite geres par le serveur dans un patch", () => {
  const base = {
    save_id: "VEY-0719R",
    turn: 709,
    next_expected_save: { save_id: "VEY-0720", parent_save_id: "VEY-0719R", turn: 710 },
  };
  assert.throws(() => materializeTurnPayload(base, {}, {}, {
    mode: "patch",
    expected_head_sha: "a".repeat(40),
    expected_current_save_id: "VEY-0719R",
    save_id: "VEY-0720",
    turn: 710,
    event_time: { year: 347, day: 513, clock: "01:26" },
    record_time: timestamp,
    current_patch: { save_id: "forged" },
    world_patch: {},
    hidden_patch: {},
    events: [{ event_id: "EVT-0720-0001" }],
  }), /champ g.r. par le serveur interdit: save_id/);
});

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
  assert.throws(
    () => validateTurnPayload(base, '{"event_id":"EVT-0719R-0008"}\n', payload),
    /ne peut pas être une reconstruction/,
  );
});

test("refuse de réutiliser un event_id déjà présent", () => {
  const { base, payload } = fixture();
  payload.events[0].event_id = "EVT-0719R-0008";
  payload.current.last_event_id = "EVT-0719R-0008";
  assert.throws(
    () => validateTurnPayload(base, '{"event_id":"EVT-0719R-0008"}\n', payload),
    /event_id déjà présent/,
  );
});

test("refuse un journal existant qui ne correspond pas à CURRENT", () => {
  const { base, payload } = fixture();
  assert.throws(
    () => validateTurnPayload(base, '{"event_id":"EVT-0719R-0007"}\n', payload),
    /dernier événement attendu EVT-0719R-0008/,
  );
});

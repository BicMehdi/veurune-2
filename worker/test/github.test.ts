import assert from "node:assert/strict";
import test from "node:test";
import { commitTurn, loadGame, type GitHubEnv } from "../src/github.ts";

const EXPECTED_HEAD = "a".repeat(40);
const ACTUAL_HEAD = "b".repeat(40);

const env: GitHubEnv = {
  GITHUB_REPO_TOKEN: "test-token-never-sent",
  GITHUB_OWNER: "BicMehdi",
  GITHUB_REPO: "veurune-2",
  GITHUB_BRANCH: "main",
};

test("charge les règles de narration au même commit que tout le canon", async (t) => {
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = String(input);
    requests.push(url);

    if (url.endsWith("/git/ref/heads/main")) return Response.json({ object: { sha: EXPECTED_HEAD } });
    if (url.includes("/contents/state/CURRENT.yaml")) {
      return new Response(JSON.stringify({ save_id: "VEY-0721", turn: 711 }));
    }
    if (url.includes("/contents/state/WORLD.yaml")) return new Response("world");
    if (url.includes("/contents/state/HIDDEN.yaml")) return new Response("hidden");
    if (url.includes("/contents/SYSTEM/BOOTSTRAP.md")) return new Response("bootstrap");
    if (url.includes("/contents/rules/PERSISTENCE.md")) return new Response("persistence");
    if (url.includes("/contents/rules/NARRATION_DARK_FANTASY.md")) return new Response("dark-rules");
    if (url.includes("/contents/events/0700-0799.jsonl")) {
      return new Response('{"event_id":"EVT-0721-0001"}\n');
    }
    throw new Error(`requête inattendue: ${url}`);
  });

  const result = await loadGame(env);

  assert.equal(result.headSha, EXPECTED_HEAD);
  assert.equal(result.narration_rules, "dark-rules");
  assert.equal(result.persistence, "persistence");
  assert.equal(result.current, JSON.stringify({ save_id: "VEY-0721", turn: 711 }));
  assert.equal(result.recentEvents, '{"event_id":"EVT-0721-0001"}');
  assert.ok(requests.slice(1).every((url) => url.endsWith(`ref=${EXPECTED_HEAD}`)));
});

function payload() {
  return {
    expected_head_sha: EXPECTED_HEAD,
    expected_current_save_id: "VEY-0719R",
    save: {
      save_id: "VEY-0720",
      parent_save_id: "VEY-0719R",
      turn: 710,
      event_time: { year: 347, day: 513, clock: "01:25" },
      record_time: "2026-08-12T12:00:00Z",
      fiction_advanced: true,
    },
    current: {
      save_id: "VEY-0720",
      parent_save_id: "VEY-0719R",
      turn: 710,
      record_time: "2026-08-12T12:00:00Z",
      last_event_id: "EVT-0720-0001",
      next_expected_save: { save_id: "VEY-0721", parent_save_id: "VEY-0720", turn: 711 },
    },
    world: { save_id: "VEY-0720", turn: 710, audience: "player_visible" },
    hidden: { save_id: "VEY-0720", turn: 710, audience: "gm_only" },
    events: [{
      event_id: "EVT-0720-0001",
      save_id: "VEY-0720",
      parent_save_id: "VEY-0719R",
      turn: 710,
      event_time: { year: 347, day: 513, clock: "01:25" },
      record_time: "2026-08-12T12:00:00Z",
    }],
  };
}

test("refuse un HEAD périmé avant toute écriture GitHub", async (t) => {
  const requests: Array<{ url: string; method: string }> = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    requests.push({ url: String(input), method: init?.method || "GET" });
    return Response.json({ object: { sha: ACTUAL_HEAD } });
  });

  await assert.rejects(
    () => commitTurn(env, payload()),
    new RegExp(`HEAD attendu ${EXPECTED_HEAD}, HEAD actuel ${ACTUAL_HEAD}`),
  );
  assert.deepEqual(requests, [{
    url: "https://api.github.com/repos/BicMehdi/veurune-2/git/ref/heads/main",
    method: "GET",
  }]);
});

test("met à jour main en fast-forward et jamais avec force", async (t) => {
  const requests: Array<{ url: string; method: string; body?: string | null }> = [];
  let blobIndex = 0;
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = String(input);
    const method = init?.method || "GET";
    const body = typeof init?.body === "string" ? init.body : null;
    requests.push({ url, method, body });

    if (url.endsWith("/git/ref/heads/main")) return Response.json({ object: { sha: EXPECTED_HEAD } });
    if (url.includes("/contents/state/CURRENT.yaml")) {
      return new Response(JSON.stringify({
        save_id: "VEY-0719R",
        turn: 709,
        last_event_id: "EVT-0719R-0008",
        next_expected_save: { save_id: "VEY-0720", parent_save_id: "VEY-0719R", turn: 710 },
      }));
    }
    if (url.includes("/contents/events/0700-0799.jsonl")) return new Response('{"event_id":"EVT-0719R-0008"}\n');
    if (url.includes("/contents/saves/VEY-0720.yaml")) return new Response("not found", { status: 404 });
    if (url.endsWith(`/git/commits/${EXPECTED_HEAD}`)) return Response.json({ tree: { sha: "base-tree" } });
    if (url.endsWith("/git/blobs")) return Response.json({ sha: `blob-${++blobIndex}` });
    if (url.endsWith("/git/trees")) return Response.json({ sha: "new-tree" });
    if (url.endsWith("/git/commits")) return Response.json({ sha: "c".repeat(40) });
    if (url.endsWith("/git/refs/heads/main")) return Response.json({ object: { sha: "c".repeat(40) } });
    throw new Error(`requête inattendue: ${method} ${url}`);
  });

  const result = await commitTurn(env, payload());
  assert.deepEqual(result, {
    status: "committed",
    commitSha: "c".repeat(40),
    saveId: "VEY-0720",
    turn: 710,
    eventCount: 1,
  });

  const patch = requests.find((request) => request.method === "PATCH");
  assert.ok(patch);
  assert.equal(patch.url, "https://api.github.com/repos/BicMehdi/veurune-2/git/refs/heads/main");
  assert.deepEqual(JSON.parse(patch.body || "{}"), { sha: "c".repeat(40), force: false });
  assert.equal(requests.filter((request) => request.method === "POST" && request.url.endsWith("/git/blobs")).length, 5);
});

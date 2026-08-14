import assert from "node:assert/strict";
import test from "node:test";
import { checkSaveStatus, commitTurn, fetchMasterSection, loadGame, searchMaster, type GitHubEnv } from "../src/github.ts";

const EXPECTED_HEAD = "a".repeat(40);
const ACTUAL_HEAD = "b".repeat(40);

const env: GitHubEnv = {
  GITHUB_REPO_TOKEN: "test-token-never-sent",
  DICE_RECEIPT_KEY: "test-receipt-key",
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
    if (url.includes("/contents/state/MEHDI_PROFILE.yaml")) return new Response("profile");
    if (url.includes("/contents/state/NARRATIVE_MEMORY.yaml")) return new Response("memory");
    if (url.includes("/contents/state/MEHDI_SHEET.yaml")) return new Response("sheet");
    if (url.includes("/contents/reference/MASTER_INDEX.md")) return new Response("master-index");
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
  assert.equal(result.mehdi_profile, "profile");
  assert.equal(result.narrative_memory, "memory");
  assert.equal(result.mehdi_sheet, "sheet");
  assert.equal(result.master_index, "master-index");
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
    hidden: { save_id: "VEY-0720", turn: 710, audience: "gm_only", unresolved_secrets: [], invented_secret_values: [] },
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
    const url = String(input);
    requests.push({ url, method: init?.method || "GET" });
    if (url.includes("/contents/saves/VEY-0720.yaml")) return new Response("not found", { status: 404 });
    return Response.json({ commit: { sha: ACTUAL_HEAD, commit: { tree: { sha: "base-tree" } } } });
  });

  await assert.rejects(
    () => commitTurn(env, payload()),
    new RegExp(`HEAD attendu ${EXPECTED_HEAD}, HEAD actuel ${ACTUAL_HEAD}`),
  );
  assert.deepEqual(requests.map((request) => request.method), ["GET", "GET"]);
});

test("met à jour main en fast-forward et jamais avec force", async (t) => {
  const requests: Array<{ url: string; method: string; body?: string | null }> = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = String(input);
    const method = init?.method || "GET";
    const body = typeof init?.body === "string" ? init.body : null;
    requests.push({ url, method, body });

    if (url.endsWith("/branches/main")) {
      return Response.json({ commit: { sha: EXPECTED_HEAD, commit: { tree: { sha: "base-tree" } } } });
    }
    if (url.includes("/contents/state/CURRENT.yaml")) {
      return new Response(JSON.stringify({
        save_id: "VEY-0719R",
        turn: 709,
        last_event_id: "EVT-0719R-0008",
        next_expected_save: { save_id: "VEY-0720", parent_save_id: "VEY-0719R", turn: 710 },
      }));
    }
    if (url.includes("/contents/state/WORLD.yaml")) return new Response(JSON.stringify({ save_id: "VEY-0719R", turn: 709, audience: "player_visible" }));
    if (url.includes("/contents/state/HIDDEN.yaml")) return new Response(JSON.stringify({ save_id: "VEY-0719R", turn: 709, audience: "gm_only", unresolved_secrets: [], invented_secret_values: [] }));
    if (url.includes("/contents/state/MEHDI_PROFILE.yaml")) return new Response(JSON.stringify({ save_id: "VEY-0719R", turn: 709, audience: "gm_only" }));
    if (url.includes("/contents/state/NARRATIVE_MEMORY.yaml")) return new Response(JSON.stringify({ save_id: "VEY-0719R", turn: 709, audience: "gm_only", chapters: [] }));
    if (url.includes("/contents/state/MEHDI_SHEET.yaml")) return new Response(JSON.stringify({
      save_id: "VEY-0719R", turn: 709, audience: "player_visible", authority: "current_mechanical_projection",
      ruleset: "V3.2.2", formula: "2d10 + capability + mastery + modifiers",
      endurance: { current: 8, max: 14 }, defense: 13, protection: 3, resolution: { current: 2, max: 2 },
      capabilities: { vigor: 5, address: 1, instinct: 1, reason: 0, will: 2, presence: 1 },
      masteries: { melee: 3, athletics: 3 },
      techniques: ["heavy_strike"], mechanical_equipment: { Yared: { damage: 5 } }, wounds: {}, resources: { personal_crowns: 246 },
    }));
    if (url.includes("/contents/reference/MECHANICAL_PROFILES.json")) return new Response(JSON.stringify({ profiles: {} }));
    if (url.includes("/contents/events/0700-0799.jsonl")) return new Response('{"event_id":"EVT-0719R-0008"}\n');
    if (url.includes("/contents/saves/VEY-0720.yaml")) return new Response("not found", { status: 404 });
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
  assert.equal(requests.filter((request) => request.method === "POST" && request.url.endsWith("/git/blobs")).length, 0);
  const treeRequest = requests.find((request) => request.method === "POST" && request.url.endsWith("/git/trees"));
  assert.ok(treeRequest);
  const treeBody = JSON.parse(treeRequest.body || "{}");
  assert.equal(treeBody.base_tree, "base-tree");
  assert.equal(treeBody.tree.length, 8);
  assert.ok(treeBody.tree.every((entry) => typeof entry.content === "string" && !("sha" in entry)));
});

test("reconstruit un checkpoint complet depuis un patch compact", async (t) => {
  const requests: Array<{ url: string; method: string; body?: string | null }> = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = String(input);
    const method = init?.method || "GET";
    const body = typeof init?.body === "string" ? init.body : null;
    requests.push({ url, method, body });

    if (url.endsWith("/branches/main")) {
      return Response.json({ commit: { sha: EXPECTED_HEAD, commit: { tree: { sha: "base-tree" } } } });
    }
    if (url.includes("/contents/state/CURRENT.yaml")) {
      return new Response(JSON.stringify({
        save_id: "VEY-0719R",
        turn: 709,
        last_event_id: "EVT-0719R-0008",
        next_expected_save: { save_id: "VEY-0720", parent_save_id: "VEY-0719R", turn: 710 },
        scene: { location: "bridge", weather: { rain: true, wind: "low" } },
      }));
    }
    if (url.includes("/contents/state/WORLD.yaml")) {
      return new Response(JSON.stringify({ save_id: "VEY-0719R", turn: 709, audience: "player_visible", known: { bridge: true } }));
    }
    if (url.includes("/contents/state/HIDDEN.yaml")) {
      return new Response(JSON.stringify({ save_id: "VEY-0719R", turn: 709, audience: "gm_only", unresolved_secrets: [], invented_secret_values: [], clocks: { M: 1 } }));
    }
    if (url.includes("/contents/state/MEHDI_PROFILE.yaml")) {
      return new Response(JSON.stringify({ save_id: "VEY-0719R", turn: 709, audience: "gm_only", observed_patterns: [] }));
    }
    if (url.includes("/contents/state/NARRATIVE_MEMORY.yaml")) {
      return new Response(JSON.stringify({ save_id: "VEY-0719R", turn: 709, audience: "gm_only", chapters: [] }));
    }
    if (url.includes("/contents/state/MEHDI_SHEET.yaml")) {
      return new Response(JSON.stringify({
        save_id: "VEY-0719R", turn: 709, audience: "player_visible", authority: "current_mechanical_projection",
        ruleset: "V3.2.2", formula: "2d10 + capability + mastery + modifiers",
        endurance: { current: 8, max: 14 }, defense: 13, protection: 3, resolution: { current: 2, max: 2 },
        capabilities: { vigor: 5, address: 1, instinct: 1, reason: 0, will: 2, presence: 1 },
        masteries: { melee: 3, athletics: 3 },
        techniques: ["heavy_strike"], mechanical_equipment: { Yared: { damage: 5 } }, wounds: {}, resources: { personal_crowns: 246 },
      }));
    }
    if (url.includes("/contents/reference/MECHANICAL_PROFILES.json")) return new Response(JSON.stringify({ profiles: {} }));
    if (url.includes("/contents/events/0700-0799.jsonl")) return new Response('{"event_id":"EVT-0719R-0008"}\n');
    if (url.includes("/contents/saves/VEY-0720.yaml")) return new Response("not found", { status: 404 });
    if (url.endsWith("/git/trees")) return Response.json({ sha: "new-tree" });
    if (url.endsWith("/git/commits")) return Response.json({ sha: "c".repeat(40) });
    if (url.endsWith("/git/refs/heads/main")) return Response.json({ object: { sha: "c".repeat(40) } });
    throw new Error(`requete inattendue: ${method} ${url}`);
  });

  await commitTurn(env, {
    mode: "patch",
    expected_head_sha: EXPECTED_HEAD,
    expected_current_save_id: "VEY-0719R",
    save_id: "VEY-0720",
    turn: 710,
    event_time: { year: 347, day: 513, clock: "01:26" },
    record_time: "2026-08-12T12:00:00Z",
    current_patch: { scene: { weather: { wind: "strong" } } },
    world_patch: { known: { gate: true } },
    hidden_patch: { clocks: { M: 2 } },
    events: [{ event_id: "EVT-0720-0001", type: "dialogue" }],
  });

  const treeRequest = requests.find((request) => request.method === "POST" && request.url.endsWith("/git/trees"));
  assert.ok(treeRequest);
  const entries = JSON.parse(treeRequest.body || "{}").tree;
  const document = (path: string) => JSON.parse(entries.find((entry) => entry.path === path).content);
  const current = document("state/CURRENT.yaml");
  assert.deepEqual(current.scene, { location: "bridge", weather: { rain: true, wind: "strong" } });
  assert.deepEqual(document("state/WORLD.yaml").known, { bridge: true, gate: true });
  assert.deepEqual(document("state/HIDDEN.yaml").clocks, { M: 2 });
  assert.equal(document("state/MEHDI_SHEET.yaml").endurance.current, 8);
  assert.deepEqual(document("saves/VEY-0720.yaml"), current);
  assert.equal(requests.filter((request) => request.url.endsWith("/git/blobs")).length, 0);
});

test("retrouve une section ciblée du Master sans charger le Master dans load_game", async (t) => {
  const master = "# Master\n\n## `AUTH-ABSOLUTE` — Autorité persistante\n\nGitHub gouverne l'état vivant.\n\n## `PC-MEHDI` — Profil\n\nProfil descriptif.";
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = String(input);
    if (url.endsWith("/git/ref/heads/main")) return Response.json({ object: { sha: EXPECTED_HEAD } });
    if (url.includes("/contents/reference/VEY_RUNE_MASTER.md")) return new Response(master);
    throw new Error(`requête inattendue: ${url}`);
  });

  const search = await searchMaster(env, "autorité GitHub");
  assert.equal(search.results[0].id, "AUTH-ABSOLUTE");
  const section = await fetchMasterSection(env, "PC-MEHDI");
  assert.match(section.text, /Profil descriptif/);
});

test("reconnaît une sauvegarde déjà commitée après une réponse réseau perdue", async (t) => {
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = String(input);
    if (url.endsWith("/branches/main")) return Response.json({ commit: { sha: ACTUAL_HEAD, commit: { tree: { sha: "base-tree" } } } });
    if (url.endsWith("/git/ref/heads/main")) return Response.json({ object: { sha: ACTUAL_HEAD } });
    if (url.includes("/contents/saves/VEY-0720.yaml")) {
      return new Response(JSON.stringify({ save_id: "VEY-0720", turn: 710 }));
    }
    if (url.includes("/contents/events/0700-0799.jsonl")) {
      return new Response('{"event_id":"EVT-0720-0001"}\n');
    }
    throw new Error(`requête inattendue: ${url}`);
  });

  const recovered = await commitTurn(env, payload());
  assert.equal(recovered.status, "already_committed");
  assert.equal(recovered.eventFound, true);
  const checked = await checkSaveStatus(env, "VEY-0720", "EVT-0720-0001");
  assert.equal(checked.status, "committed");
});

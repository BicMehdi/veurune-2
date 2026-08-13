import { eventFileForTurn, materializeTurnPayload, parseDocument, validateTurnPayload } from "./validation.mjs";

export interface GitHubEnv {
  GITHUB_REPO_TOKEN: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
}

type Json = Record<string, unknown>;

function configuration(env: GitHubEnv) {
  return {
    owner: env.GITHUB_OWNER || "BicMehdi",
    repo: env.GITHUB_REPO || "veurune-2",
    branch: env.GITHUB_BRANCH || "main",
  };
}

async function github(env: GitHubEnv, path: string, init: RequestInit = {}) {
  if (!env.GITHUB_REPO_TOKEN) throw new Error("GITHUB_REPO_TOKEN absent");
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_REPO_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "veyrune-cloud-save/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response;
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function getHeadSha(env: GitHubEnv) {
  const { owner, repo, branch } = configuration(env);
  const response = await github(env, `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  const body = await response.json<Json>();
  return (body.object as Json).sha as string;
}

async function getHeadSnapshot(env: GitHubEnv) {
  const { owner, repo, branch } = configuration(env);
  const response = await github(env, `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`);
  const body = await response.json<Json>();
  const commit = body.commit as Json;
  const commitDetails = commit.commit as Json;
  const tree = commitDetails.tree as Json;
  return { headSha: commit.sha as string, treeSha: tree.sha as string };
}

export async function readFile(env: GitHubEnv, path: string, ref?: string, missingIsEmpty = false) {
  const { owner, repo, branch } = configuration(env);
  const url = `/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref || branch)}`;
  try {
    const response = await github(env, url, { headers: { Accept: "application/vnd.github.raw+json" } });
    return await response.text();
  } catch (error) {
    if (missingIsEmpty && error instanceof Error && error.message.startsWith("GitHub 404:")) return "";
    throw error;
  }
}

export async function loadGame(env: GitHubEnv) {
  const headSha = await getHeadSha(env);
  const currentText = await readFile(env, "state/CURRENT.yaml", headSha);
  const current = parseDocument(currentText, "state/CURRENT.yaml");
  const eventPath = eventFileForTurn(current.turn as number);
  const [world, hidden, bootstrap, persistence, narrationRules, events] = await Promise.all([
    readFile(env, "state/WORLD.yaml", headSha),
    readFile(env, "state/HIDDEN.yaml", headSha),
    readFile(env, "SYSTEM/BOOTSTRAP.md", headSha),
    readFile(env, "rules/PERSISTENCE.md", headSha),
    readFile(env, "rules/NARRATION_DARK_FANTASY.md", headSha),
    readFile(env, eventPath, headSha, true),
  ]);
  const recentEvents = events.split(/\r?\n/).filter(Boolean).slice(-50).join("\n");
  return {
    headSha,
    current: currentText,
    world,
    hidden,
    bootstrap,
    persistence,
    narration_rules: narrationRules,
    recentEvents,
    eventPath,
  };
}

export async function commitTurn(env: GitHubEnv, payload: unknown) {
  const input = payload as Json;
  const expectedHead = input.expected_head_sha as string;
  const { headSha: actualHead, treeSha: baseTree } = await getHeadSnapshot(env);
  if (actualHead !== expectedHead) throw new Error(`conflit de continuité: HEAD attendu ${expectedHead}, HEAD actuel ${actualHead}`);

  const patchMode = input.mode === "patch";
  const candidateSave = patchMode ? input : input.save as Json;
  const eventPath = eventFileForTurn(candidateSave.turn as number);
  const [baseCurrentText, baseWorldText, baseHiddenText, existingEvents, existingSave] = await Promise.all([
    readFile(env, "state/CURRENT.yaml", actualHead),
    patchMode ? readFile(env, "state/WORLD.yaml", actualHead) : Promise.resolve("{}"),
    patchMode ? readFile(env, "state/HIDDEN.yaml", actualHead) : Promise.resolve("{}"),
    readFile(env, eventPath, actualHead, true),
    readFile(env, `saves/${String(candidateSave.save_id)}.yaml`, actualHead, true),
  ]);
  if (existingSave) throw new Error(`la sauvegarde ${String(candidateSave.save_id)} existe déjà`);
  const baseCurrent = parseDocument(baseCurrentText, "CURRENT distant");
  const materializedPayload = materializeTurnPayload(
    baseCurrent,
    parseDocument(baseWorldText, "WORLD distant"),
    parseDocument(baseHiddenText, "HIDDEN distant"),
    payload,
  );
  const transaction = validateTurnPayload(baseCurrent, existingEvents, materializedPayload);
  const { owner, repo, branch } = configuration(env);

  const treeResponse = await github(env, `/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseTree,
      tree: Object.entries(transaction.files).map(([path, content]) => ({
        path,
        mode: "100644",
        type: "blob",
        content,
      })),
    }),
  });
  const tree = await treeResponse.json<Json>();
  const newCommitResponse = await github(env, `/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `Sauvegarder ${transaction.saveId} (tour ${transaction.turn})`,
      tree: tree.sha,
      parents: [actualHead],
    }),
  });
  const newCommit = await newCommitResponse.json<Json>();
  await github(env, `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });
  return {
    status: "committed",
    commitSha: newCommit.sha as string,
    saveId: transaction.saveId,
    turn: transaction.turn,
    eventCount: transaction.eventCount,
  };
}

export function canonicalUrl(env: GitHubEnv, path: string) {
  const { owner, repo, branch } = configuration(env);
  return `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
}

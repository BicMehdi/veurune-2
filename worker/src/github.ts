import { eventFileForTurn, parseDocument, validateTurnPayload } from "./validation.mjs";

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

function utf8Base64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export async function getHeadSha(env: GitHubEnv) {
  const { owner, repo, branch } = configuration(env);
  const response = await github(env, `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  const body = await response.json<Json>();
  return (body.object as Json).sha as string;
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
  const actualHead = await getHeadSha(env);
  if (actualHead !== expectedHead) throw new Error(`conflit de continuité: HEAD attendu ${expectedHead}, HEAD actuel ${actualHead}`);

  const save = input.save as Json;
  const eventPath = eventFileForTurn(save.turn as number);
  const [baseCurrentText, existingEvents, existingSave] = await Promise.all([
    readFile(env, "state/CURRENT.yaml", actualHead),
    readFile(env, eventPath, actualHead, true),
    readFile(env, `saves/${String(save.save_id)}.yaml`, actualHead, true),
  ]);
  if (existingSave) throw new Error(`la sauvegarde ${String(save.save_id)} existe déjà`);
  const transaction = validateTurnPayload(parseDocument(baseCurrentText, "CURRENT distant"), existingEvents, payload);
  const { owner, repo, branch } = configuration(env);

  const commitResponse = await github(env, `/repos/${owner}/${repo}/git/commits/${actualHead}`);
  const baseCommit = await commitResponse.json<Json>();
  const baseTree = ((baseCommit.tree as Json).sha) as string;
  const treeEntries = await Promise.all(Object.entries(transaction.files).map(async ([path, content]) => {
    const blobResponse = await github(env, `/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: utf8Base64(content), encoding: "base64" }),
    });
    const blob = await blobResponse.json<Json>();
    return { path, mode: "100644", type: "blob", sha: blob.sha };
  }));
  const treeResponse = await github(env, `/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTree, tree: treeEntries }),
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

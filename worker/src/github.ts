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
  const startedAt = Date.now();
  const headSha = await getHeadSha(env);
  const currentText = await readFile(env, "state/CURRENT.yaml", headSha);
  const current = parseDocument(currentText, "state/CURRENT.yaml");
  const eventPath = eventFileForTurn(current.turn as number);
  const [world, hidden, mehdiProfile, narrativeMemory, mehdiSheet, masterIndex, bootstrap, persistence, narrationRules, events] = await Promise.all([
    readFile(env, "state/WORLD.yaml", headSha),
    readFile(env, "state/HIDDEN.yaml", headSha),
    readFile(env, "state/MEHDI_PROFILE.yaml", headSha),
    readFile(env, "state/NARRATIVE_MEMORY.yaml", headSha),
    readFile(env, "state/MEHDI_SHEET.yaml", headSha),
    readFile(env, "reference/MASTER_INDEX.md", headSha),
    readFile(env, "SYSTEM/BOOTSTRAP.md", headSha),
    readFile(env, "rules/PERSISTENCE.md", headSha),
    readFile(env, "rules/NARRATION_DARK_FANTASY.md", headSha),
    readFile(env, eventPath, headSha, true),
  ]);
  const recentEvents = events.split(/\r?\n/).filter(Boolean).slice(-50).join("\n");
  const result = {
    headSha,
    current: currentText,
    world,
    hidden,
    mehdi_profile: mehdiProfile,
    narrative_memory: narrativeMemory,
    mehdi_sheet: mehdiSheet,
    master_index: masterIndex,
    bootstrap,
    persistence,
    narration_rules: narrationRules,
    recentEvents,
    eventPath,
  };
  console.log({ operation: "load_game", status: "ok", head_sha: headSha, save_id: current.save_id, turn: current.turn, duration_ms: Date.now() - startedAt });
  return result;
}

async function inspectSaveAtHead(env: GitHubEnv, headSha: string, saveId: string, expectedEventId?: string) {
  const saveText = await readFile(env, `saves/${saveId}.yaml`, headSha, true);
  if (!saveText) return { status: "not_committed" as const, headSha, saveId };
  const save = parseDocument(saveText, `saves/${saveId}.yaml`);
  const eventPath = eventFileForTurn(save.turn as number);
  const eventsText = await readFile(env, eventPath, headSha, true);
  const eventFound = !expectedEventId || eventsText.split(/\r?\n/).some((line) => {
    if (!line) return false;
    try { return parseDocument(line, eventPath).event_id === expectedEventId; } catch { return false; }
  });
  return {
    status: eventFound ? "committed" as const : "incomplete" as const,
    headSha,
    saveId,
    turn: save.turn,
    expectedEventId: expectedEventId || null,
    eventFound,
  };
}

export async function checkSaveStatus(env: GitHubEnv, saveId: string, expectedEventId?: string) {
  const headSha = await getHeadSha(env);
  const result = await inspectSaveAtHead(env, headSha, saveId, expectedEventId);
  console.log({ operation: "check_save_status", status: result.status, head_sha: headSha, save_id: saveId, expected_event_id: expectedEventId || null });
  return result;
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function masterSections(text: string) {
  const matches = [...text.matchAll(/^(#{2,4})\s+(.+)$/gm)];
  return matches.map((match, index) => {
    const title = match[2].trim();
    const explicitId = title.match(/`([^`]+)`/)?.[1];
    const fallback = normalized(title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `section-${index + 1}`;
    const start = match.index || 0;
    const end = matches[index + 1]?.index ?? text.length;
    return { id: explicitId || fallback, title, text: text.slice(start, end).trim() };
  });
}

export async function searchMaster(env: GitHubEnv, query: string) {
  const headSha = await getHeadSha(env);
  const master = await readFile(env, "reference/VEY_RUNE_MASTER.md", headSha);
  const terms = normalized(query).split(/\s+/).filter((term) => term.length > 1);
  const results = masterSections(master)
    .map((section) => {
      const title = normalized(section.title);
      const body = normalized(section.text);
      const score = terms.reduce((total, term) => total + (title.includes(term) ? 8 : 0) + (body.includes(term) ? 1 : 0), 0);
      return { id: section.id, title: section.title, score, hidden_review_required: /HIDDEN_MJ|HIDDEN_MJ_PREPARED/.test(section.text) };
    })
    .filter((section) => section.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 8);
  return { headSha, query, results, policy: "Index MJ uniquement; un résultat ne prouve jamais une activation dans l'état vivant." };
}

export async function fetchMasterSection(env: GitHubEnv, id: string) {
  const headSha = await getHeadSha(env);
  const master = await readFile(env, "reference/VEY_RUNE_MASTER.md", headSha);
  const section = masterSections(master).find((candidate) => candidate.id === id);
  if (!section) throw new Error(`section Master inconnue: ${id}`);
  return {
    headSha,
    id: section.id,
    title: section.title,
    text: section.text,
    hidden_review_required: /HIDDEN_MJ|HIDDEN_MJ_PREPARED/.test(section.text),
    policy: "Subordonné à GitHub state/. Ne jamais révéler un secret ni convertir du contenu préparé en état courant.",
  };
}

export async function commitTurn(env: GitHubEnv, payload: unknown) {
  const startedAt = Date.now();
  const input = payload as Json;
  const expectedHead = input.expected_head_sha as string;
  const patchMode = input.mode === "patch";
  const candidateSave = patchMode ? input : input.save as Json;
  const candidateSaveId = String(candidateSave.save_id);
  const candidateTurn = candidateSave.turn as number;
  const candidateEvents = Array.isArray(input.events) ? input.events as Json[] : [];
  const expectedEventId = candidateEvents[candidateEvents.length - 1]?.event_id as string | undefined;
  const { headSha: actualHead, treeSha: baseTree } = await getHeadSnapshot(env);
  if (actualHead !== expectedHead) {
    const existing = await inspectSaveAtHead(env, actualHead, candidateSaveId, expectedEventId);
    if (existing.status === "committed" && existing.turn === candidateTurn) {
      console.log({ operation: "save_turn", status: "already_committed", save_id: candidateSaveId, turn: candidateTurn, duration_ms: Date.now() - startedAt });
      return { ...existing, status: "already_committed", eventCount: candidateEvents.length };
    }
    console.warn({ operation: "save_turn", status: "conflict", expected_head_sha: expectedHead, actual_head_sha: actualHead, save_id: candidateSaveId });
    throw new Error(`conflit de continuité: HEAD attendu ${expectedHead}, HEAD actuel ${actualHead}`);
  }

  const eventPath = eventFileForTurn(candidateSave.turn as number);
  const [baseCurrentText, baseWorldText, baseHiddenText, baseProfileText, baseMemoryText, baseSheetText, existingEvents, existingSave] = await Promise.all([
    readFile(env, "state/CURRENT.yaml", actualHead),
    readFile(env, "state/WORLD.yaml", actualHead),
    readFile(env, "state/HIDDEN.yaml", actualHead),
    readFile(env, "state/MEHDI_PROFILE.yaml", actualHead),
    readFile(env, "state/NARRATIVE_MEMORY.yaml", actualHead),
    readFile(env, "state/MEHDI_SHEET.yaml", actualHead),
    readFile(env, eventPath, actualHead, true),
    readFile(env, `saves/${String(candidateSave.save_id)}.yaml`, actualHead, true),
  ]);
  if (existingSave) {
    const existing = await inspectSaveAtHead(env, actualHead, candidateSaveId, expectedEventId);
    if (existing.status === "committed" && existing.turn === candidateTurn) {
      return { ...existing, status: "already_committed", eventCount: candidateEvents.length };
    }
    throw new Error(`la sauvegarde ${String(candidateSave.save_id)} existe déjà`);
  }
  const baseCurrent = parseDocument(baseCurrentText, "CURRENT distant");
  const baseWorld = parseDocument(baseWorldText, "WORLD distant");
  const baseHidden = parseDocument(baseHiddenText, "HIDDEN distant");
  const baseProfile = parseDocument(baseProfileText, "MEHDI_PROFILE distant");
  const baseMemory = parseDocument(baseMemoryText, "NARRATIVE_MEMORY distant");
  const baseSheet = parseDocument(baseSheetText, "MEHDI_SHEET distant");
  const materializedPayload = materializeTurnPayload(
    baseCurrent,
    baseWorld,
    baseHidden,
    baseProfile,
    baseMemory,
    baseSheet,
    payload,
  );
  const transaction = validateTurnPayload(baseCurrent, existingEvents, materializedPayload, { hidden: baseHidden });
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
  const result = {
    status: "committed",
    commitSha: newCommit.sha as string,
    saveId: transaction.saveId,
    turn: transaction.turn,
    eventCount: transaction.eventCount,
  };
  console.log({ operation: "save_turn", status: "committed", commit_sha: newCommit.sha, save_id: transaction.saveId, turn: transaction.turn, event_count: transaction.eventCount, duration_ms: Date.now() - startedAt });
  return result;
}

export function canonicalUrl(env: GitHubEnv, path: string) {
  const { owner, repo, branch } = configuration(env);
  return `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
}

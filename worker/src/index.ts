import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler, getMcpAuthContext } from "agents/mcp/server";
import { z } from "zod";
import { canonicalUrl, commitTurn, getHeadSha, loadGame, readFile, type GitHubEnv } from "./github";
import { GitHubHandler } from "./github-handler";
import { eventFileForTurn, parseDocument } from "./validation.mjs";
import type { Props } from "./utils";

interface Env extends GitHubEnv {
  OAUTH_KV: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;
  ALLOWED_GITHUB_LOGIN: string;
}

const PUBLIC_DOCUMENTS: Record<string, { title: string; path: string }> = {
  current: { title: "État canonique courant de Veyrune", path: "state/CURRENT.yaml" },
  world: { title: "Projection joueur du monde", path: "state/WORLD.yaml" },
  bootstrap: { title: "Procédure de reprise canonique", path: "SYSTEM/BOOTSTRAP.md" },
  persistence: { title: "Règles de persistance", path: "rules/PERSISTENCE.md" },
};

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function assertOwner(env: Env) {
  const props = getMcpAuthContext()?.props as Props | undefined;
  const login = props?.login;
  if (!login) throw new Error("identité GitHub absente");
  if (login.toLowerCase() !== env.ALLOWED_GITHUB_LOGIN.toLowerCase()) {
    throw new Error(`compte GitHub non autorisé: ${login}`);
  }
}

function createVeyruneServer(env: Env) {
  const server = new McpServer(
    { name: "veyrune-cloud-save", version: "1.0.0" },
    {
      instructions: "Mémoire canonique de Veyrune. Avant une reprise ou un tour, appeler load_game. Après chaque tour narratif résolu, appeler save_turn avant d'afficher la narration finale. Ne jamais annoncer un tour comme acquis si save_turn échoue. Ne jamais révéler hidden au joueur.",
    },
  );

  server.registerTool(
    "search",
    {
      description: "Use this when you need to locate a player-visible canonical Veyrune document.",
      inputSchema: z.object({ query: z.string() }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async ({ query }) => {
      assertOwner(env);
      const needle = query.toLowerCase();
      const results = Object.entries(PUBLIC_DOCUMENTS)
        .filter(([, item]) => `${item.title} ${item.path}`.toLowerCase().includes(needle))
        .map(([id, item]) => ({ id, title: item.title, url: canonicalUrl(env, item.path) }));
      return textResult(JSON.stringify({ results }));
    },
  );

  server.registerTool(
    "fetch",
    {
      description: "Use this when you need the full text of one player-visible Veyrune document returned by search.",
      inputSchema: z.object({ id: z.string() }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async ({ id }) => {
      assertOwner(env);
      const item = PUBLIC_DOCUMENTS[id];
      if (!item) throw new Error(`document public inconnu: ${id}`);
      const text = await readFile(env, item.path);
      return textResult(JSON.stringify({ id, title: item.title, text, url: canonicalUrl(env, item.path) }));
    },
  );

  server.registerTool(
    "load_game",
    {
      description: "Use this before resuming Veyrune or resolving a new turn. Loads rules, current state, recent events, player projection, and GM-only unresolved state from canonical GitHub main.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async () => {
      assertOwner(env);
      return textResult(JSON.stringify(await loadGame(env)));
    },
  );

  server.registerTool(
    "save_turn",
    {
      description: "Use this exactly once after resolving a narrative turn and before presenting its final narration. Atomically validates and commits the save, projections, hidden state, and append-only events to GitHub main. If it fails, the narrative turn is not committed.",
      inputSchema: z.object({
        expected_head_sha: z.string().regex(/^[0-9a-f]{40}$/i),
        expected_current_save_id: z.string(),
        save: z.record(z.string(), z.unknown()),
        current: z.record(z.string(), z.unknown()),
        world: z.record(z.string(), z.unknown()),
        hidden: z.record(z.string(), z.unknown()),
        events: z.array(z.record(z.string(), z.unknown())).min(1).max(50),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: false },
    },
    async (payload) => {
      assertOwner(env);
      return textResult(JSON.stringify(await commitTurn(env, payload)));
    },
  );

  server.registerTool(
    "check_health",
    {
      description: "Use this when diagnosing whether the Veyrune cloud save service can authenticate and reach canonical GitHub main.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async () => {
      assertOwner(env);
      const headSha = await getHeadSha(env);
      const current = parseDocument(await readFile(env, "state/CURRENT.yaml", headSha), "CURRENT");
      return textResult(JSON.stringify({
        status: "ok",
        headSha,
        saveId: current.save_id,
        turn: current.turn,
        eventFile: eventFileForTurn(current.turn as number),
      }));
    },
  );
  return server;
}

const apiHandler = {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return createMcpHandler(() => createVeyruneServer(env), { route: "/mcp" })(request, env, ctx);
  },
};

export default new OAuthProvider<Env>({
  apiHandler,
  apiRoute: "/mcp",
  authorizeEndpoint: "/authorize",
  clientRegistrationEndpoint: "/register",
  defaultHandler: GitHubHandler as ExportedHandler<Env>,
  tokenEndpoint: "/token",
});

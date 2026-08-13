import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler, getMcpAuthContext } from "agents/mcp/server";
import { z } from "zod";
import { canonicalUrl, checkSaveStatus, commitTurn, fetchMasterSection, getHeadSha, loadGame, readFile, searchMaster } from "./github";
import { GitHubHandler } from "./github-handler";
import type { VeyruneEnv } from "./env";
import { eventFileForTurn, parseDocument, validateHiddenState } from "./validation.mjs";
import type { Props } from "./utils";

const PUBLIC_DOCUMENTS: Record<string, { title: string; path: string }> = {
  current: { title: "État canonique courant de Veyrune", path: "state/CURRENT.yaml" },
  world: { title: "Projection joueur du monde", path: "state/WORLD.yaml" },
  bootstrap: { title: "Procédure de reprise canonique", path: "SYSTEM/BOOTSTRAP.md" },
  persistence: { title: "Règles de persistance", path: "rules/PERSISTENCE.md" },
  narration: { title: "Règles permanentes de narration Dark Fantasy", path: "rules/NARRATION_DARK_FANTASY.md" },
};

const eventTimeSchema = z.union([
  z.string(),
  z.object({
    year: z.number().int().positive(),
    day: z.number().int().positive(),
    clock: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  }),
]);

const fullSaveTurnSchema = z.object({
  mode: z.literal("full").optional(),
  expected_head_sha: z.string().regex(/^[0-9a-f]{40}$/i),
  expected_current_save_id: z.string(),
  save: z.record(z.string(), z.unknown()),
  current: z.record(z.string(), z.unknown()),
  world: z.record(z.string(), z.unknown()),
  hidden: z.record(z.string(), z.unknown()),
  mehdi_profile: z.record(z.string(), z.unknown()).optional(),
  narrative_memory: z.record(z.string(), z.unknown()).optional(),
  events: z.array(z.record(z.string(), z.unknown())).min(1).max(50),
});

const patchSaveTurnSchema = z.object({
  mode: z.literal("patch"),
  expected_head_sha: z.string().regex(/^[0-9a-f]{40}$/i),
  expected_current_save_id: z.string(),
  save_id: z.string().describe("Identifiant next_expected_save chargé par load_game."),
  turn: z.number().int().nonnegative().describe("Tour next_expected_save chargé par load_game."),
  event_time: eventTimeSchema,
  record_time: z.string().describe("Horodatage UTC ISO-8601 de l'enregistrement."),
  current_patch: z.record(z.string(), z.unknown()).describe(
    "Uniquement les changements de CURRENT. Fusion récursive; null supprime une clé; un tableau remplace le tableau entier. Omettre tout élément inchangé.",
  ),
  world_patch: z.record(z.string(), z.unknown()).describe(
    "Uniquement les changements visibles du monde. Ne jamais inclure de secret. Même sémantique de fusion.",
  ),
  hidden_patch: z.record(z.string(), z.unknown()).describe(
    "Uniquement les changements MJ cachés. Même sémantique de fusion.",
  ),
  mehdi_profile_patch: z.record(z.string(), z.unknown()).optional().describe(
    "Observations descriptives fondées sur une instruction OOC explicite ou des événements canoniques cités; jamais un choix majeur futur.",
  ),
  narrative_memory_patch: z.record(z.string(), z.unknown()).optional().describe(
    "Résumé de chapitre fondé sur des event_id existants; ne remplace jamais le journal événementiel.",
  ),
  events: z.array(z.record(z.string(), z.unknown())).min(1).max(50).describe(
    "Événements atomiques nouveaux. Fournir event_id et les faits; le serveur ajoute automatiquement filiation, tour et horodatages.",
  ),
});

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function assertOwner(env: VeyruneEnv) {
  const props = getMcpAuthContext()?.props as Props | undefined;
  const login = props?.login;
  if (!login) throw new Error("identité GitHub absente");
  if (login.toLowerCase() !== env.ALLOWED_GITHUB_LOGIN.toLowerCase()) {
    throw new Error(`compte GitHub non autorisé: ${login}`);
  }
}

function createVeyruneServer(env: VeyruneEnv) {
  const server = new McpServer(
    { name: "veyrune-cloud-save", version: "1.2.0" },
    {
      instructions: "Mémoire canonique et règles MJ de Veyrune. Avant une reprise ou un tour, appeler load_game et appliquer persistence puis narration_rules; utiliser mehdi_profile et narrative_memory pour la continuité. Consulter le Master seulement par section ciblée. Après chaque tour narratif résolu, appeler save_turn avant d'afficher la narration finale. Ne jamais annoncer un tour comme acquis si save_turn échoue. Ne jamais révéler hidden ni une section MJ non découverte.",
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
      description: "Use this before resuming Veyrune or resolving a new turn. Loads persistence and permanent Dark Fantasy narration rules, current state, recent events, player projection, and GM-only unresolved state from canonical GitHub main.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async () => {
      assertOwner(env);
      return textResult(JSON.stringify(await loadGame(env)));
    },
  );

  server.registerTool(
    "search_master",
    {
      description: "Recherche MJ ciblée dans le Master consolidé. Un résultat décrit du lore ou de la préparation et ne constitue jamais un état courant. Ne jamais exposer directement une donnée HIDDEN_MJ au joueur.",
      inputSchema: z.object({ query: z.string().min(2) }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async ({ query }) => {
      assertOwner(env);
      return textResult(JSON.stringify(await searchMaster(env, query)));
    },
  );

  server.registerTool(
    "fetch_master_section",
    {
      description: "Charge une seule section du Master trouvée par search_master. Appliquer son cloisonnement et la subordonner à l'état GitHub vivant.",
      inputSchema: z.object({ id: z.string().min(1) }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async ({ id }) => {
      assertOwner(env);
      return textResult(JSON.stringify(await fetchMasterSection(env, id)));
    },
  );

  server.registerTool(
    "save_turn",
    {
      description: "Use this exactly once after resolving a narrative turn and before presenting its final narration. Prefer mode=patch: send only changed facts; the server reconstructs and validates the complete checkpoint without losing untouched depth. Legacy full mode remains accepted. Atomically commits the complete save, projections, hidden state, and append-only events to GitHub main. If it fails, the narrative turn is not committed.",
      inputSchema: z.union([patchSaveTurnSchema, fullSaveTurnSchema]),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: false },
    },
    async (payload) => {
      assertOwner(env);
      return textResult(JSON.stringify(await commitTurn(env, payload)));
    },
  );

  server.registerTool(
    "check_save_status",
    {
      description: "Vérifie après une réponse réseau perdue si une sauvegarde et son dernier événement ont réellement été commités. N'avance jamais la fiction.",
      inputSchema: z.object({ save_id: z.string(), expected_event_id: z.string().optional() }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async ({ save_id, expected_event_id }) => {
      assertOwner(env);
      return textResult(JSON.stringify(await checkSaveStatus(env, save_id, expected_event_id)));
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
      const [currentText, hiddenText, profileText, memoryText] = await Promise.all([
        readFile(env, "state/CURRENT.yaml", headSha),
        readFile(env, "state/HIDDEN.yaml", headSha),
        readFile(env, "state/MEHDI_PROFILE.yaml", headSha),
        readFile(env, "state/NARRATIVE_MEMORY.yaml", headSha),
      ]);
      const current = parseDocument(currentText, "CURRENT");
      const hidden = validateHiddenState(parseDocument(hiddenText, "HIDDEN"), "HIDDEN");
      const profile = parseDocument(profileText, "MEHDI_PROFILE");
      const memory = parseDocument(memoryText, "NARRATIVE_MEMORY");
      const synchronizedProjections: Array<[Record<string, unknown>, string]> = [
        [hidden, "HIDDEN"],
        [profile, "MEHDI_PROFILE"],
        [memory, "NARRATIVE_MEMORY"],
      ];
      for (const [projection, label] of synchronizedProjections) {
        if (projection.save_id !== current.save_id || projection.turn !== current.turn) throw new Error(`${label} désynchronisé de CURRENT`);
      }
      return textResult(JSON.stringify({
        status: "ok",
        headSha,
        saveId: current.save_id,
        turn: current.turn,
        eventFile: eventFileForTurn(current.turn as number),
        protectedHiddenRegistry: true,
        mehdiProfileLoaded: true,
        narrativeMemoryLoaded: true,
      }));
    },
  );
  return server;
}

const apiHandler = {
  fetch(request: Request, env: VeyruneEnv, ctx: ExecutionContext) {
    return createMcpHandler(() => createVeyruneServer(env), { route: "/mcp" })(request, env, ctx);
  },
};

export default new OAuthProvider<VeyruneEnv>({
  apiHandler,
  apiRoute: "/mcp",
  authorizeEndpoint: "/authorize",
  clientRegistrationEndpoint: "/register",
  defaultHandler: GitHubHandler as ExportedHandler<VeyruneEnv>,
  tokenEndpoint: "/token",
});

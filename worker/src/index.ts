import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler, getMcpAuthContext } from "agents/mcp/server";
import { z } from "zod";
import { canonicalUrl, checkSaveStatus, commitTurn, fetchMasterSection, getHeadSha, loadGame, readFile, searchMaster } from "./github";
import { GitHubHandler } from "./github-handler";
import type { VeyruneEnv } from "./env";
import { issueDiceRoll } from "./dice.ts";
import { eventFileForTurn, parseDocument, validateHiddenState, validateMehdiSheet } from "./validation.mjs";
import type { Props } from "./utils";

const PUBLIC_DOCUMENTS: Record<string, { title: string; path: string }> = {
  current: { title: "État canonique courant de Veyrune", path: "state/CURRENT.yaml" },
  world: { title: "Projection joueur du monde", path: "state/WORLD.yaml" },
  bootstrap: { title: "Procédure de reprise canonique", path: "SYSTEM/BOOTSTRAP.md" },
  persistence: { title: "Règles de persistance", path: "rules/PERSISTENCE.md" },
  narration: { title: "Règles permanentes de narration Dark Fantasy", path: "rules/NARRATION_DARK_FANTASY.md" },
  mehdi_sheet: { title: "Fiche mécanique actuelle de Mehdi", path: "state/MEHDI_SHEET.yaml" },
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
  mehdi_sheet: z.record(z.string(), z.unknown()).optional(),
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
  mehdi_sheet_patch: z.record(z.string(), z.unknown()).optional().describe(
    "Uniquement les changements mécaniques explicitement causés pendant le tour: Endurance, ressources, états, valeurs, équipement ou progression. Une valeur inchangée est omise.",
  ),
  events: z.array(z.record(z.string(), z.unknown())).min(1).max(50).describe(
    "Événements atomiques nouveaux. Fournir event_id et les faits; le serveur ajoute automatiquement filiation, tour et horodatages. Pour un test, reprendre exactement roll_id, notation et dice de roll_dice, puis capacité, maîtrise, modificateurs, total, cible publique ou hidden, marge publique si permise, degré et conséquence.",
  ),
});

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function encodeDiceRequest(count: number, sides: number, expectedHeadSha: string, expectedSaveId: string, label?: string) {
  const encodedLabel = label ? encodeURIComponent(label) : "";
  return `roll_dice:${count}d${sides}:${expectedHeadSha}:${expectedSaveId}:${encodedLabel}`;
}

function parseDiceSearch(query: string) {
  const match = query.trim().match(/^roll_dice\s+(\d+)d(\d+)\s+([0-9a-f]{40})\s+(VEY-\d{4}[A-Z]*)(?:\s+(.+))?$/i);
  if (!match) return null;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  if (!Number.isInteger(count) || count < 1 || count > 10 || !Number.isInteger(sides) || sides < 2 || sides > 100) {
    throw new Error("demande de dés hors limites");
  }
  return { count, sides, expectedHeadSha: match[3], expectedSaveId: match[4], label: match[5] };
}

function parseDiceRequest(id: string) {
  const match = id.match(/^roll_dice:(\d+)d(\d+):([0-9a-f]{40}):(VEY-\d{4}[A-Z]*):(.*)$/i);
  if (!match) return null;
  return {
    count: Number(match[1]),
    sides: Number(match[2]),
    expectedHeadSha: match[3],
    expectedSaveId: match[4],
    label: match[5] ? decodeURIComponent(match[5]) : undefined,
  };
}

async function issueCanonicalDiceRoll(
  env: VeyruneEnv,
  count: number,
  sides: number,
  label: string | undefined,
  expectedHeadSha: string,
  expectedSaveId: string,
) {
  const actualHeadSha = await getHeadSha(env);
  if (actualHeadSha !== expectedHeadSha) {
    throw new Error(`canon modifié avant le jet: HEAD attendu ${expectedHeadSha}, HEAD actuel ${actualHeadSha}; recharger avec load_game`);
  }
  const current = parseDocument(await readFile(env, "state/CURRENT.yaml", actualHeadSha), "CURRENT avant jet");
  const nextSave = current.next_expected_save as Record<string, unknown> | undefined;
  if (nextSave?.save_id !== expectedSaveId) {
    throw new Error(`save_id de jet invalide: attendu ${String(nextSave?.save_id || "inconnu")}, reçu ${expectedSaveId}`);
  }
  return issueDiceRoll(count, sides, label, expectedHeadSha, expectedSaveId, env.COOKIE_ENCRYPTION_KEY);
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
    { name: "veyrune-cloud-save", version: "1.3.0" },
    {
      instructions: "Mémoire canonique et règles MJ de Veyrune. Avant une reprise ou un tour, appeler load_game et appliquer persistence puis narration_rules; utiliser mehdi_sheet pour chaque test et mehdi_profile/narrative_memory pour la continuité. Tout hasard passe par roll_dice. Afficher chaque jet public selon narration_rules, y compris au milieu d'un dialogue; garder seulement l'opposition sensible cachée. Consulter le Master par section ciblée. Après chaque tour narratif résolu, appeler save_turn avant d'afficher la narration finale. Ne jamais annoncer un tour comme acquis si save_turn échoue. Ne jamais révéler hidden ni une section MJ non découverte.",
    },
  );

  server.registerTool(
    "search",
    {
      description: "Use this when you need to locate a player-visible canonical Veyrune document. Compatibility: if roll_dice is absent from the connector catalog, call search with `roll_dice 2d10 <headSha> <next_save_id> <label>`, then fetch the returned id to generate the signed roll.",
      inputSchema: z.object({ query: z.string() }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async ({ query }) => {
      assertOwner(env);
      const diceRequest = parseDiceSearch(query);
      if (diceRequest) {
        const id = encodeDiceRequest(
          diceRequest.count,
          diceRequest.sides,
          diceRequest.expectedHeadSha,
          diceRequest.expectedSaveId,
          diceRequest.label,
        );
        return textResult(JSON.stringify({
          results: [{
            id,
            title: `Jet Veyrune signé — ${diceRequest.count}d${diceRequest.sides}${diceRequest.label ? ` — ${diceRequest.label}` : ""}`,
            url: canonicalUrl(env, "rules/NARRATION_DARK_FANTASY.md"),
          }],
          compatibility_bridge: true,
          next_step: "Appeler fetch avec cet id. Cela exécute le même générateur signé que roll_dice et n'avance pas la fiction.",
        }));
      }
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
      description: "Use this when you need the full text of one player-visible Veyrune document returned by search, or to execute a signed roll_dice compatibility id returned by search.",
      inputSchema: z.object({ id: z.string() }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async ({ id }) => {
      assertOwner(env);
      const diceRequest = parseDiceRequest(id);
      if (diceRequest) {
        return textResult(JSON.stringify(await issueCanonicalDiceRoll(
          env,
          diceRequest.count,
          diceRequest.sides,
          diceRequest.label,
          diceRequest.expectedHeadSha,
          diceRequest.expectedSaveId,
        )));
      }
      const item = PUBLIC_DOCUMENTS[id];
      if (!item) throw new Error(`document public inconnu: ${id}`);
      const text = await readFile(env, item.path);
      return textResult(JSON.stringify({ id, title: item.title, text, url: canonicalUrl(env, item.path) }));
    },
  );

  server.registerTool(
    "load_game",
    {
      description: "Use this before resuming Veyrune or resolving a new turn. Loads rules, current state, Mehdi's current mechanical sheet, recent events, player projection, and GM-only continuity from canonical GitHub main.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async () => {
      assertOwner(env);
      return textResult(JSON.stringify(await loadGame(env)));
    },
  );

  server.registerTool(
    "roll_dice",
    {
      description: "Génère les dés impartiaux d'un test Veyrune sans avancer la fiction. Utiliser ce résultat exact dans l'événement sauvegardé et afficher tout jet public selon les règles de narration.",
      inputSchema: z.object({
        count: z.number().int().min(1).max(10).default(2),
        sides: z.number().int().min(2).max(100).default(10),
        label: z.string().max(120).optional(),
        expected_head_sha: z.string().regex(/^[0-9a-f]{40}$/i).describe("headSha reçu de load_game; lie le jet au canon chargé."),
        expected_save_id: z.string().describe("save_id suivant reçu de CURRENT.next_expected_save; lie le jet au tour à sauvegarder."),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: false },
    },
    async ({ count, sides, label, expected_head_sha, expected_save_id }) => {
      assertOwner(env);
      return textResult(JSON.stringify(await issueCanonicalDiceRoll(env, count, sides, label, expected_head_sha, expected_save_id)));
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
      description: "Use this exactly once after resolving a narrative turn and before presenting its final narration. Prefer mode=patch: send only changed facts; the server reconstructs and validates the complete checkpoint without losing untouched depth. Preserve mehdi_sheet unless an explicit mechanical event changes it. Every roll event must reuse the exact roll_dice output. Legacy full mode remains accepted. Atomically commits the complete save, projections, hidden state, and append-only events to GitHub main. If it fails, the narrative turn is not committed.",
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
      const [currentText, hiddenText, profileText, memoryText, sheetText] = await Promise.all([
        readFile(env, "state/CURRENT.yaml", headSha),
        readFile(env, "state/HIDDEN.yaml", headSha),
        readFile(env, "state/MEHDI_PROFILE.yaml", headSha),
        readFile(env, "state/NARRATIVE_MEMORY.yaml", headSha),
        readFile(env, "state/MEHDI_SHEET.yaml", headSha),
      ]);
      const current = parseDocument(currentText, "CURRENT");
      const hidden = validateHiddenState(parseDocument(hiddenText, "HIDDEN"), "HIDDEN");
      const profile = parseDocument(profileText, "MEHDI_PROFILE");
      const memory = parseDocument(memoryText, "NARRATIVE_MEMORY");
      const sheet = validateMehdiSheet(parseDocument(sheetText, "MEHDI_SHEET"), "MEHDI_SHEET");
      const synchronizedProjections: Array<[Record<string, unknown>, string]> = [
        [hidden, "HIDDEN"],
        [profile, "MEHDI_PROFILE"],
        [memory, "NARRATIVE_MEMORY"],
        [sheet, "MEHDI_SHEET"],
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
        mehdiSheetLoaded: true,
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

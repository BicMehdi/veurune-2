export const WORKER_VERSION = "1.9.0";
export const API_SCHEMA_VERSION = "P16.0";

const AVAILABLE_ACTIONS = Object.freeze([
  "search",
  "fetch",
  "load_game",
  "roll_dice",
  "validate_check",
  "roll_check",
  "search_master",
  "fetch_master_section",
  "save_turn",
  "check_save_status",
  "check_health",
]);

const FEATURE_FLAGS = Object.freeze({
  signed_checks: true,
  generic_npc_profiles: true,
  companion_live_sheets: true,
  companion_changes: true,
  patch_saves: true,
  hidden_rolls: true,
  signed_hidden_redactions: true,
  npc_functional_classification: true,
  gm_hidden_profile_choice: true,
  master_targeted_access: true,
  save_idempotency_check: true,
  legacy_five_tool_bridge: true,
});

export function runtimeManifest() {
  return {
    runtime: {
      worker_version: WORKER_VERSION,
      api_schema_version: API_SCHEMA_VERSION,
      rules_compatibility: "P16",
      git_branch: "main",
    },
    capabilities: {
      actions: [...AVAILABLE_ACTIONS],
      features: { ...FEATURE_FLAGS },
      compatibility_bridge: {
        available_through: ["search", "fetch"],
        purpose: "Permet à un ancien catalogue ChatGPT limité à cinq outils d'appeler les fonctions de lecture, de diagnostic et de mécanique.",
      },
    },
  };
}

type CompatibilityOperation = "capabilities" | "doctor" | "tool_help" | "search_master" | "fetch_master_section" | "check_save_status";

export function encodeCompatibilityRequest(operation: CompatibilityOperation, payload: Record<string, unknown> = {}) {
  return `compatibility:${operation}:${encodeURIComponent(JSON.stringify(payload))}`;
}

export function parseCompatibilitySearch(query: string) {
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();
  if (["capabilities", "get_capabilities", "available_actions", "outils disponibles"].includes(normalized)) {
    return { operation: "capabilities" as const, payload: {} };
  }
  if (["doctor", "diagnostic", "diagnostic complet"].includes(normalized)) {
    return { operation: "doctor" as const, payload: {} };
  }
  if (AVAILABLE_ACTIONS.includes(normalized)) {
    return { operation: "tool_help" as const, payload: { action: normalized } };
  }
  const masterSearch = trimmed.match(/^search_master\s+([\s\S]{2,})$/i);
  if (masterSearch) return { operation: "search_master" as const, payload: { query: masterSearch[1] } };
  const masterFetch = trimmed.match(/^fetch_master_section\s+(\S+)$/i);
  if (masterFetch) return { operation: "fetch_master_section" as const, payload: { id: masterFetch[1] } };
  const saveStatus = trimmed.match(/^check_save_status\s+(\S+)(?:\s+(\S+))?$/i);
  if (saveStatus) return {
    operation: "check_save_status" as const,
    payload: { save_id: saveStatus[1], expected_event_id: saveStatus[2] },
  };
  return null;
}

export function parseCompatibilityRequest(id: string) {
  const match = id.match(/^compatibility:(capabilities|doctor|tool_help|search_master|fetch_master_section|check_save_status):(.+)$/);
  if (!match) return null;
  let payload: unknown;
  try { payload = JSON.parse(decodeURIComponent(match[2])); } catch { throw new Error("identifiant de compatibilité invalide"); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("charge utile de compatibilité invalide");
  return { operation: match[1] as CompatibilityOperation, payload: payload as Record<string, unknown> };
}

export function compatibilityToolHelp(action: string) {
  const usage: Record<string, string> = {
    validate_check: "search avec `validate_check <JSON conforme au schéma P16>`, puis fetch sur l'id retourné.",
    roll_check: "search avec `roll_check <JSON conforme au schéma P16>`, puis fetch sur l'id retourné. Copier ensuite signed_check dans l'événement.",
    roll_dice: "search avec `roll_dice 2d10 <headSha> <next_save_id> <libellé>`, puis fetch sur l'id retourné.",
    search_master: "search avec `search_master <termes>`, puis fetch sur l'id retourné.",
    fetch_master_section: "search avec `fetch_master_section <SECTION_ID>`, puis fetch sur l'id retourné.",
    check_save_status: "search avec `check_save_status <save_id> [event_id]`, puis fetch sur l'id retourné.",
    check_health: "Appeler directement check_health; sa réponse inclut versions, capacités et diagnostic.",
    load_game: "Appeler directement load_game; sa réponse inclut désormais versions et capacités.",
    save_turn: "Appeler directement save_turn. Le pont search/fetch ne réalise jamais d'écriture. Rafraîchir le catalogue pour voir mode=patch et companion_changes dans son schéma complet.",
    search: "Outil historique de découverte et pont de compatibilité.",
    fetch: "Outil historique de lecture et d'exécution des identifiants de compatibilité retournés par search.",
  };
  return {
    action,
    registered_on_worker: AVAILABLE_ACTIONS.includes(action),
    legacy_access: {
      direct_if_five_tool_catalog: ["search", "fetch", "load_game", "save_turn", "check_health"].includes(action),
      through_search_fetch: ["roll_dice", "validate_check", "roll_check", "search_master", "fetch_master_section", "check_save_status"].includes(action),
    },
    usage: usage[action] || "Action enregistrée sur le Worker; rafraîchir le catalogue MCP pour l'appeler directement.",
    ...runtimeManifest(),
  };
}

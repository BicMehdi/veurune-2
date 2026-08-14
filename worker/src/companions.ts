type Json = Record<string, unknown>;

export type CompanionChange = {
  change_id: string;
  profile_id: string;
  character_key: string;
  domain: "mechanics" | "wound" | "equipment" | "technique" | "relation" | "emotion" | "objective";
  path: string;
  operation: "set" | "remove";
  before: unknown;
  after?: unknown;
  cause: string;
  source_event_id: string;
  duration: "momentary" | "scene" | "temporary" | "durable" | "permanent";
};

type PersistedProfileAssignment = {
  target_ref: string;
  profile_id: string;
  locked_by_roll_id: string;
  assigned_in_save_id: string;
};

function record(value: unknown): Json | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : undefined;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function same(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function valueAt(root: unknown, path: string) {
  return path.split(".").filter(Boolean).reduce<unknown>((value, segment) => record(value)?.[segment], root);
}

function setAt(root: Json, path: string, value: unknown, remove: boolean) {
  const segments = path.split(".").filter(Boolean);
  if (segments.length < 2) throw new Error(`COMPANION_CHANGE_INVALID: chemin trop large ${path}`);
  let cursor = root;
  for (const segment of segments.slice(0, -1)) {
    const next = record(cursor[segment]);
    cursor[segment] = next || {};
    cursor = cursor[segment] as Json;
  }
  const leaf = segments[segments.length - 1]!;
  if (remove) delete cursor[leaf];
  else cursor[leaf] = clone(value);
}

function profileFor(catalog: unknown, profileId: string) {
  const profile = record(record(catalog)?.profiles)?.[profileId];
  const prepared = record(profile);
  if (!prepared || prepared.prepared_character_profile !== true || !profileId.startsWith("CHAR-")) {
    throw new Error(`COMPANION_CHANGE_INVALID: fiche nommée inconnue ou non préparée ${profileId}`);
  }
  return prepared;
}

function canonicalKeys(profile: Json) {
  return Array.isArray(profile.canonical_actor_keys)
    ? profile.canonical_actor_keys.filter((value): value is string => typeof value === "string")
    : [];
}

function seedSheet(profileId: string, characterKey: string, profile: Json, saveId: string, turn: number) {
  if (!canonicalKeys(profile).includes(characterKey)) {
    throw new Error(`COMPANION_CHANGE_INVALID: ${profileId} ne correspond pas à ${characterKey}`);
  }
  const mechanics = record(profile.mechanics) || {};
  const endurance = mechanics.endurance;
  if (!Number.isInteger(endurance) || (endurance as number) < 1) {
    throw new Error(`COMPANION_CHANGE_INVALID: Endurance préparée absente pour ${profileId}`);
  }
  const techniques = Object.fromEntries(
    (Array.isArray(mechanics.techniques) ? mechanics.techniques : [])
      .filter((value): value is string => typeof value === "string" && Boolean(value))
      .map((id) => [id, { label: id, status: "available", source: "prepared_profile" }]),
  );
  return {
    authority: "live_github_companion_projection",
    profile_id: profileId,
    character_key: characterKey,
    created_in_save_id: saveId,
    created_at_turn: turn,
    updated_in_save_id: saveId,
    updated_at_turn: turn,
    mechanics: {
      endurance: { current: endurance, max: endurance },
      defense: mechanics.defense,
      protection: mechanics.protection,
      capabilities: clone(record(mechanics.capabilities) || {}),
      masteries: clone(record(mechanics.masteries) || {}),
      resources: {},
    },
    wounds: {},
    equipment: {},
    techniques,
    relations: {},
    emotions: { momentary: {}, durable: {} },
    objectives: {},
  };
}

function sourceRefs(value: unknown, sourceEventId: string, label: string) {
  const refs = record(value)?.source_event_ids;
  if (!Array.isArray(refs) || !refs.includes(sourceEventId)) {
    throw new Error(`COMPANION_CHANGE_INVALID: ${label}.source_event_ids doit citer ${sourceEventId}`);
  }
}

function integer(value: unknown, min: number, max: number, label: string) {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`COMPANION_CHANGE_INVALID: ${label} doit être un entier de ${min} à ${max}`);
  }
  return value as number;
}

function validateAfter(change: CompanionChange, current: unknown) {
  if (["relation", "objective"].includes(change.domain) && !["durable", "permanent"].includes(change.duration)) {
    throw new Error(`COMPANION_CHANGE_INVALID: ${change.domain} exige une durée durable ou permanente`);
  }
  if (["wound", "equipment", "technique"].includes(change.domain) && !["temporary", "durable", "permanent"].includes(change.duration)) {
    throw new Error(`COMPANION_CHANGE_INVALID: durée trop brève pour ${change.domain}`);
  }
  if (change.domain === "mechanics"
    && /^(?:mechanics\.endurance\.max|mechanics\.(?:defense|protection)|mechanics\.(?:capabilities|masteries)\.)/.test(change.path)
    && change.duration !== "permanent") {
    throw new Error("COMPANION_CHANGE_INVALID: une progression mécanique exige une durée permanente");
  }
  if (change.operation === "remove") {
    if (change.domain === "mechanics") throw new Error("COMPANION_CHANGE_INVALID: une valeur mécanique ne peut pas être supprimée");
    return;
  }
  if (!("after" in change)) throw new Error(`COMPANION_CHANGE_INVALID: valeur after absente pour ${change.change_id}`);
  const after = change.after;
  if (change.domain === "mechanics") {
    if (/^mechanics\.endurance\.(?:current|max)$/.test(change.path)) {
      const next = integer(after, 0, 100, change.path);
      if (change.path.endsWith(".max") && typeof current === "number" && next > current + 1) {
        throw new Error("COMPANION_CHANGE_INVALID: progression d'Endurance limitée à +1 par événement");
      }
      return;
    }
    if (/^mechanics\.(?:defense|protection)$/.test(change.path)) {
      const next = integer(after, 0, 40, change.path);
      if (typeof current === "number" && next > current + 1) throw new Error("COMPANION_CHANGE_INVALID: progression défensive limitée à +1 par événement");
      return;
    }
    if (/^mechanics\.capabilities\.[a-z0-9_-]+$/.test(change.path)) {
      const next = integer(after, 0, 10, change.path);
      if (typeof current === "number" && next > current + 1) throw new Error("COMPANION_CHANGE_INVALID: progression de capacité limitée à +1 par événement");
      return;
    }
    if (/^mechanics\.masteries\.[a-z0-9_-]+$/.test(change.path)) {
      const next = integer(after, 0, 5, change.path);
      if (typeof current === "number" && next > current + 1) throw new Error("COMPANION_CHANGE_INVALID: progression de maîtrise limitée à +1 par événement");
      return;
    }
    if (/^mechanics\.resources\.[a-z0-9_-]+$/.test(change.path)) {
      if (typeof after !== "number" || !Number.isFinite(after) || after < 0) throw new Error(`COMPANION_CHANGE_INVALID: ressource invalide ${change.path}`);
      return;
    }
    throw new Error(`COMPANION_CHANGE_INVALID: chemin mécanique interdit ${change.path}`);
  }
  const patterns: Record<CompanionChange["domain"], RegExp> = {
    mechanics: /^$/,
    wound: /^wounds\.[a-z0-9_-]+$/,
    equipment: /^equipment\.[a-z0-9_-]+$/,
    technique: /^techniques\.[a-z0-9_-]+$/,
    relation: /^relations\.[a-z0-9_-]+$/,
    emotion: /^emotions\.(?:momentary|durable)\.[a-z0-9_-]+$/,
    objective: /^objectives\.[a-z0-9_-]+$/,
  };
  if (!patterns[change.domain].test(change.path)) throw new Error(`COMPANION_CHANGE_INVALID: chemin ${change.domain} interdit ${change.path}`);
  const item = record(after);
  if (!item) throw new Error(`COMPANION_CHANGE_INVALID: objet attendu pour ${change.path}`);
  sourceRefs(item, change.source_event_id, change.path);
  if (change.domain === "wound") {
    if (typeof item.label !== "string" || !["minor", "moderate", "severe", "critical"].includes(String(item.severity))
      || !["active", "stabilized", "healing", "healed", "sequela"].includes(String(item.status))) {
      throw new Error(`COMPANION_CHANGE_INVALID: blessure incomplète ${change.path}`);
    }
  } else if (change.domain === "equipment") {
    if (typeof item.label !== "string" || !["carried", "equipped", "stored", "lost", "broken", "destroyed"].includes(String(item.status))) {
      throw new Error(`COMPANION_CHANGE_INVALID: équipement incomplet ${change.path}`);
    }
  } else if (change.domain === "technique") {
    if (typeof item.label !== "string" || !["available", "limited", "lost"].includes(String(item.status))) {
      throw new Error(`COMPANION_CHANGE_INVALID: technique incomplète ${change.path}`);
    }
  } else if (change.domain === "relation") {
    if (typeof item.target_ref !== "string" || !record(item.dimensions)
      || !Array.isArray(item.anchors) || !Array.isArray(item.promises) || !Array.isArray(item.debts) || !Array.isArray(item.limits)) {
      throw new Error(`COMPANION_CHANGE_INVALID: relation multidimensionnelle incomplète ${change.path}`);
    }
    for (const [dimension, score] of Object.entries(record(item.dimensions)!)) integer(score, -5, 5, `${change.path}.dimensions.${dimension}`);
  } else if (change.domain === "emotion") {
    if (typeof item.label !== "string") throw new Error(`COMPANION_CHANGE_INVALID: émotion sans libellé ${change.path}`);
    integer(item.intensity, 1, 5, `${change.path}.intensity`);
    const durablePath = change.path.startsWith("emotions.durable.");
    if (durablePath && !["durable", "permanent"].includes(change.duration)) throw new Error("COMPANION_CHANGE_INVALID: une émotion durable exige une durée durable ou permanente");
    if (!durablePath && !["momentary", "scene", "temporary"].includes(change.duration)) throw new Error("COMPANION_CHANGE_INVALID: émotion momentanée avec durée incohérente");
  } else if (change.domain === "objective") {
    if (typeof item.summary !== "string" || !["active", "blocked", "completed", "abandoned"].includes(String(item.status))) {
      throw new Error(`COMPANION_CHANGE_INVALID: objectif incomplet ${change.path}`);
    }
  }
}

function validateSheetMechanics(sheet: Json, profileId: string) {
  const mechanics = record(sheet.mechanics);
  const endurance = record(mechanics?.endurance);
  if (!mechanics || !endurance) throw new Error(`COMPANION_CHANGE_INVALID: mécanique vivante incomplète ${profileId}`);
  const current = integer(endurance.current, 0, 100, `${profileId}.endurance.current`);
  const maximum = integer(endurance.max, 1, 100, `${profileId}.endurance.max`);
  if (current > maximum) throw new Error(`COMPANION_CHANGE_INVALID: Endurance actuelle supérieure au maximum pour ${profileId}`);
  integer(mechanics.defense, 0, 40, `${profileId}.defense`);
  integer(mechanics.protection, 0, 40, `${profileId}.protection`);
  for (const [key, value] of Object.entries(record(mechanics.capabilities) || {})) integer(value, 0, 10, `${profileId}.capabilities.${key}`);
  for (const [key, value] of Object.entries(record(mechanics.masteries) || {})) integer(value, 0, 5, `${profileId}.masteries.${key}`);
  for (const [key, value] of Object.entries(record(mechanics.resources) || {})) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`COMPANION_CHANGE_INVALID: ressource invalide ${profileId}.${key}`);
  }
}

function ensureSheet(sheets: Json, profileId: string, characterKey: string, profile: Json, saveId: string, turn: number) {
  const existing = record(sheets[profileId]);
  if (existing) {
    if (existing.profile_id !== profileId || existing.character_key !== characterKey || existing.authority !== "live_github_companion_projection") {
      throw new Error(`COMPANION_CHANGE_INVALID: identité de fiche incohérente ${profileId}`);
    }
    validateSheetMechanics(existing, profileId);
    return existing;
  }
  const created = seedSheet(profileId, characterKey, profile, saveId, turn);
  validateSheetMechanics(created, profileId);
  sheets[profileId] = created;
  return created;
}

export function applyCompanionPersistence(
  baseHiddenValue: unknown,
  candidateHiddenValue: unknown,
  events: Json[],
  changes: CompanionChange[],
  assignments: PersistedProfileAssignment[],
  catalog: unknown,
  saveId: string,
  turn: number,
) {
  const baseHidden = record(baseHiddenValue) || {};
  const candidateHidden = clone(record(candidateHiddenValue) || {});
  if (!same(baseHidden.companion_sheets, candidateHidden.companion_sheets)
    || !same(baseHidden.companion_change_log, candidateHidden.companion_change_log)) {
    throw new Error("COMPANION_CHANGE_INVALID: companion_sheets et companion_change_log sont gérés par le serveur");
  }
  if (!Array.isArray(changes) || changes.length > 20) throw new Error("COMPANION_CHANGE_INVALID: vingt changements maximum par tour");
  const eventIds = new Set(events.map((event) => event.event_id).filter((id): id is string => typeof id === "string"));
  const sheets = clone(record(baseHidden.companion_sheets) || {});
  const log = clone(Array.isArray(baseHidden.companion_change_log) ? baseHidden.companion_change_log : []) as unknown[];
  const knownChangeIds = new Set(log.map((entry) => record(entry)?.change_id).filter((id): id is string => typeof id === "string"));

  for (const assignment of assignments) {
    if (!assignment.profile_id.startsWith("CHAR-")) continue;
    const profile = profileFor(catalog, assignment.profile_id);
    const targetSegments = assignment.target_ref.split(".");
    const characterKey = targetSegments[targetSegments.length - 1]?.replace(/^hidden:/, "") || "";
    const wasAbsent = !record(sheets[assignment.profile_id]);
    ensureSheet(sheets, assignment.profile_id, characterKey, profile, saveId, turn);
    if (wasAbsent) {
      const sourceEvent = events.find((event) => event.roll_id === assignment.locked_by_roll_id);
      const changeId = `ACT-${assignment.locked_by_roll_id}`;
      if (!sourceEvent || typeof sourceEvent.event_id !== "string") throw new Error("COMPANION_CHANGE_INVALID: activation sans événement de jet signé");
      if (knownChangeIds.has(changeId)) throw new Error(`COMPANION_CHANGE_INVALID: activation dupliquée ${changeId}`);
      knownChangeIds.add(changeId);
      log.push({
        change_id: changeId,
        profile_id: assignment.profile_id,
        character_key: characterKey,
        domain: "activation",
        path: `companion_sheets.${assignment.profile_id}`,
        operation: "seed_from_prepared_profile",
        cause: "premier test canonique signé du personnage vivant",
        source_event_id: sourceEvent.event_id,
        duration: "permanent",
        save_id: saveId,
        turn,
      });
    }
  }

  const eventPathPairs = new Set<string>();
  for (const change of changes) {
    if (!change.change_id?.trim() || knownChangeIds.has(change.change_id)) throw new Error(`COMPANION_CHANGE_INVALID: change_id absent ou dupliqué ${change.change_id || ""}`);
    if (!eventIds.has(change.source_event_id)) throw new Error(`COMPANION_CHANGE_INVALID: événement source absent ${change.source_event_id}`);
    const sourceEvent = events.find((event) => event.event_id === change.source_event_id);
    const companionRefs = Array.isArray(sourceEvent?.companion_refs) ? sourceEvent.companion_refs : [];
    if (!companionRefs.includes(change.profile_id)) {
      throw new Error(`COMPANION_CHANGE_INVALID: ${change.source_event_id}.companion_refs doit citer ${change.profile_id}`);
    }
    if (!change.cause?.trim() || change.cause.length > 500) throw new Error(`COMPANION_CHANGE_INVALID: cause absente ou trop longue ${change.change_id}`);
    const eventPathKey = `${change.source_event_id}:${change.profile_id}:${change.path}`;
    if (eventPathPairs.has(eventPathKey)) throw new Error(`COMPANION_CHANGE_INVALID: même chemin modifié deux fois par le même événement ${change.path}`);
    eventPathPairs.add(eventPathKey);
    const profile = profileFor(catalog, change.profile_id);
    const sheet = ensureSheet(sheets, change.profile_id, change.character_key, profile, saveId, turn);
    const current = valueAt(sheet, change.path);
    if (!same(current, change.before)) throw new Error(`COMPANION_CHANGE_CONFLICT: before incorrect pour ${change.profile_id}.${change.path}`);
    if (change.operation === "remove" && current === undefined) throw new Error(`COMPANION_CHANGE_INVALID: suppression sans valeur existante ${change.path}`);
    if (change.operation === "set" && same(current, change.after)) throw new Error(`COMPANION_CHANGE_INVALID: changement sans effet ${change.path}`);
    validateAfter(change, current);
    setAt(sheet, change.path, change.after, change.operation === "remove");
    validateSheetMechanics(sheet, change.profile_id);
    sheet.updated_in_save_id = saveId;
    sheet.updated_at_turn = turn;
    knownChangeIds.add(change.change_id);
    log.push({ ...clone(change), save_id: saveId, turn });
  }

  if (Object.keys(sheets).length > 0) candidateHidden.companion_sheets = sheets;
  if (log.length > 0) candidateHidden.companion_change_log = log;
  return candidateHidden;
}

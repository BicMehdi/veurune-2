import { rollDice } from "./dice.ts";
import { decryptJson, encryptJson } from "./receipt.ts";

type Json = Record<string, unknown>;

export type CheckModifier = {
  id: string;
  label: string;
  value: number;
  source: string;
};

export const NPC_CLASSES = [
  "incidental",
  "established",
  "important",
  "mysterious",
  "important_mysterious",
] as const;

export type NpcClass = typeof NPC_CLASSES[number];

export const NPC_CLASSIFICATION_CRITERIA = [
  "immediate_interchangeable_function",
  "stable_identity",
  "established_role",
  "durable_identity",
  "recurring_role",
  "personal_objectives",
  "significant_relationship",
  "faction_role",
  "determinative_information_or_resource",
  "durable_consequence_capacity",
  "identity_unresolved",
  "role_unresolved",
  "capabilities_unresolved",
  "affiliation_unresolved",
  "intentions_unresolved",
] as const;

export type NpcClassificationCriterion = typeof NPC_CLASSIFICATION_CRITERIA[number];

export type NpcClassification = {
  npc_class: NpcClass;
  classification_basis: "prepared_registry" | "ooc_explicit" | "gm_pre_roll_design";
  classified_before_roll: true;
  rationale: string;
  criteria: NpcClassificationCriterion[];
  evidence_refs: string[];
  source_ref: string;
};

export type ProfileAssignment = {
  target_ref: string;
  profile_id: string;
  basis: "established_fiction" | "minimal_default" | "hidden_conception";
  rationale: string;
  evidence_refs: string[];
  npc_classification?: NpcClassification;
};

export type CheckOpposition =
  | { kind: "difficulty"; value: number; visibility: "public" | "hidden"; source: string }
  | { kind: "defense"; target_ref: string; visibility: "public" | "hidden" }
  | {
      kind: "derived";
      target_ref: string;
      base: number;
      capability: string;
      mastery?: string;
      visibility: "public" | "hidden";
    };

export type CheckRequest = {
  actor_ref: string;
  actor_visibility?: "public" | "hidden";
  action: string;
  capability: string;
  mastery: string;
  modifiers?: CheckModifier[];
  profile_assignments?: ProfileAssignment[];
  opposition: CheckOpposition;
  expected_head_sha: string;
  expected_save_id: string;
};

export type CheckContext = {
  current: Json;
  world: Json;
  hidden: Json;
  mehdiSheet: Json;
  mechanicalProfiles?: Json;
  npcDesignRegistry?: Json;
};

type ActorMechanics = {
  actor_ref: string;
  source: string;
  capabilities: Record<string, number>;
  masteries: Record<string, number>;
  defense?: number;
};

type PreparedCheck = {
  request: CheckRequest;
  actor: ActorMechanics;
  capability: { id: string; value: number };
  mastery: { id: string; value: number };
  modifiers: CheckModifier[];
  modifier_total: number;
  profile_assignments: ProfileAssignment[];
  opposition: {
    kind: CheckOpposition["kind"];
    visibility: "public" | "hidden";
    value: number;
    source: string;
    target_ref?: string;
  };
};

type MechanicalReceiptPayload = {
  version: 1 | 2;
  kind: "mechanical_check";
  expected_head_sha: string;
  expected_save_id: string;
  roll_id: string;
  notation: string;
  dice: number[];
  dice_total: number;
  generated_at: string;
  gm_resolution: Json;
  public_display: Json;
  required_profile_persistence?: PersistedProfileAssignment[];
};

export type PersistedProfileAssignment = ProfileAssignment & {
  locked_by_roll_id: string;
  assigned_in_save_id: string;
};

function record(value: unknown): Json | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : undefined;
}

function numericMap(value: unknown) {
  const source = record(value) || {};
  return Object.fromEntries(Object.entries(source).filter(([, item]) => typeof item === "number")) as Record<string, number>;
}

function valueAt(root: unknown, path: string) {
  return path.split(".").filter(Boolean).reduce<unknown>((value, segment) => record(value)?.[segment], root);
}

function unresolvedPath(hidden: Json, actorPath: string) {
  const entries = Array.isArray(hidden.unresolved_secrets) ? hidden.unresolved_secrets : [];
  const candidates = new Set([actorPath, `${actorPath}.stats`, `${actorPath}.mechanics`]);
  return entries.some((entry) => {
    const path = record(entry)?.path;
    return typeof path === "string" && candidates.has(path.replace(/^hidden_state\./, ""));
  });
}

const NPC_CLASS_SET = new Set<string>(NPC_CLASSES);
const NPC_CRITERION_SET = new Set<string>(NPC_CLASSIFICATION_CRITERIA);
const IMPORTANT_CRITERIA = new Set<NpcClassificationCriterion>([
  "durable_identity",
  "recurring_role",
  "personal_objectives",
  "significant_relationship",
  "faction_role",
  "determinative_information_or_resource",
  "durable_consequence_capacity",
]);
const MYSTERY_CRITERIA = new Set<NpcClassificationCriterion>([
  "identity_unresolved",
  "role_unresolved",
  "capabilities_unresolved",
  "affiliation_unresolved",
  "intentions_unresolved",
]);
const HIDDEN_CONCEPTION_CLASSES = new Set<NpcClass>(["important", "mysterious", "important_mysterious"]);

function classificationList(value: unknown, label: string, allowed: Set<string>, min: number, max: number) {
  if (!Array.isArray(value) || value.length < min || value.length > max
    || value.some((item) => typeof item !== "string" || !allowed.has(item))) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: ${label} invalide`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: ${label} contient un doublon`);
  }
  return value as string[];
}

function validatedNpcClassification(value: unknown, label: string): NpcClassification {
  const classification = record(value);
  if (!classification) throw new Error(`PROFILE_ASSIGNMENT_INVALID: classification PNJ absente pour ${label}`);
  if (typeof classification.npc_class !== "string" || !NPC_CLASS_SET.has(classification.npc_class)) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: npc_class invalide pour ${label}`);
  }
  if (!["prepared_registry", "ooc_explicit", "gm_pre_roll_design"].includes(String(classification.classification_basis))) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: classification_basis invalide pour ${label}`);
  }
  if (classification.classified_before_roll !== true) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: le classement de ${label} doit précéder le premier jet`);
  }
  for (const [field, limit] of [["rationale", 800], ["source_ref", 240]] as const) {
    const text = classification[field];
    if (typeof text !== "string" || !text.trim() || text.length > limit) {
      throw new Error(`PROFILE_ASSIGNMENT_INVALID: ${field} de classement invalide pour ${label}`);
    }
  }
  const criteria = classificationList(classification.criteria, `criteria de ${label}`, NPC_CRITERION_SET, 1, 10) as NpcClassificationCriterion[];
  const evidenceRefs = classification.evidence_refs;
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length < 1 || evidenceRefs.length > 8
    || evidenceRefs.some((reference) => typeof reference !== "string" || !reference.trim() || reference.length > 180)) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: références de classement invalides pour ${label}`);
  }
  const hasImportantCriterion = criteria.some((criterion) => IMPORTANT_CRITERIA.has(criterion));
  const hasMysteryCriterion = criteria.some((criterion) => MYSTERY_CRITERIA.has(criterion));
  const npcClass = classification.npc_class as NpcClass;
  if (npcClass === "incidental" && !criteria.includes("immediate_interchangeable_function")) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: incidental exige une fonction immédiate interchangeable pour ${label}`);
  }
  if (npcClass === "established" && !criteria.some((criterion) => criterion === "stable_identity" || criterion === "established_role")) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: established exige une identité ou un rôle stable pour ${label}`);
  }
  if (npcClass === "important" && !hasImportantCriterion) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: important exige un critère durable pour ${label}`);
  }
  if (npcClass === "mysterious" && !hasMysteryCriterion) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: mysterious exige un élément volontairement non résolu pour ${label}`);
  }
  if (npcClass === "important_mysterious" && (!hasImportantCriterion || !hasMysteryCriterion)) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: important_mysterious exige importance et mystère pour ${label}`);
  }
  return {
    npc_class: npcClass,
    classification_basis: classification.classification_basis as NpcClassification["classification_basis"],
    classified_before_roll: true,
    rationale: classification.rationale as string,
    criteria,
    evidence_refs: [...evidenceRefs] as string[],
    source_ref: classification.source_ref as string,
  };
}

function resolvedNpcClassification(context: CheckContext, assignment: ProfileAssignment, targetPath: string) {
  const hiddenActor = record(valueAt(context.hidden, targetPath));
  const hiddenValue = hiddenActor?.npc_classification;
  const registry = record(context.npcDesignRegistry?.classifications);
  const registryValue = registry?.[assignment.target_ref];
  const candidates = [
    hiddenValue === undefined ? null : { origin: "hidden" as const, value: hiddenValue },
    registryValue === undefined ? null : { origin: "registry" as const, value: registryValue },
    assignment.npc_classification === undefined ? null : { origin: "request" as const, value: assignment.npc_classification },
  ].filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
  if (candidates.length === 0) return undefined;
  const normalized = candidates.map((candidate) => ({
    origin: candidate.origin,
    classification: validatedNpcClassification(candidate.value, assignment.target_ref),
    raw: record(candidate.value) || {},
  }));
  const first = normalized[0].classification;
  for (const candidate of normalized.slice(1)) {
    if (JSON.stringify(candidate.classification) !== JSON.stringify(first)) {
      throw new Error(`PROFILE_ASSIGNMENT_INVALID: classements contradictoires pour ${assignment.target_ref}`);
    }
  }
  if (hiddenActor?.npc_class !== undefined && hiddenActor.npc_class !== first.npc_class) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: npc_class verrouillé incohérent pour ${assignment.target_ref}`);
  }
  const registryCandidate = normalized.find((candidate) => candidate.origin === "registry");
  const allowedProfileIds = registryCandidate && Array.isArray(registryCandidate.raw.allowed_profile_ids)
    ? registryCandidate.raw.allowed_profile_ids.filter((id): id is string => typeof id === "string")
    : undefined;
  return {
    classification: first,
    origin: normalized[0].origin,
    registry_authorized: Boolean(registryCandidate),
    allowed_profile_ids: allowedProfileIds,
  };
}

function actorObject(context: CheckContext, actorRef: string) {
  if (actorRef.toLowerCase() === "mehdi") return { object: context.mehdiSheet, source: "state/MEHDI_SHEET.yaml" };
  const match = actorRef.match(/^(current|world|hidden):(.+)$/i);
  if (!match) return undefined;
  const rootName = match[1].toLowerCase() as "current" | "world" | "hidden";
  const path = match[2];
  return {
    object: valueAt(context[rootName], path),
    source: `state/${rootName.toUpperCase()}.yaml#${path}`,
    unresolved: rootName === "hidden" && unresolvedPath(context.hidden, path),
  };
}

function prepareProfileAssignments(context: CheckContext, request: CheckRequest) {
  const assignments = request.profile_assignments || [];
  if (assignments.length > 2) throw new Error("deux attributions de profil au maximum par test");
  const profiles = record(context.mechanicalProfiles?.profiles) || {};
  const seen = new Set<string>();
  const preparedAssignments: ProfileAssignment[] = [];
  const allowedTargets = new Set([request.actor_ref]);
  if (request.opposition.kind !== "difficulty") allowedTargets.add(request.opposition.target_ref);
  for (const assignment of assignments) {
    if (!allowedTargets.has(assignment.target_ref)) {
      throw new Error(`PROFILE_ASSIGNMENT_INVALID: ${assignment.target_ref} ne participe pas à ce test`);
    }
    if (!assignment.target_ref.startsWith("hidden:")) {
      throw new Error(`PROFILE_ASSIGNMENT_INVALID: la cible ${assignment.target_ref} doit être persistée dans HIDDEN`);
    }
    const targetPath = assignment.target_ref.slice("hidden:".length);
    const actorAlreadyExists = [context.current, context.world, context.hidden]
      .some((root) => record(valueAt(root, targetPath)) !== undefined);
    if (!actorAlreadyExists) {
      throw new Error(`PROFILE_ASSIGNMENT_INVALID: ${assignment.target_ref} n'existe pas dans l'état chargé; un profil ne peut pas créer un PNJ`);
    }
    if (seen.has(assignment.target_ref)) throw new Error(`PROFILE_ASSIGNMENT_INVALID: cible dupliquée ${assignment.target_ref}`);
    seen.add(assignment.target_ref);
    const profile = record(profiles[assignment.profile_id]);
    const genericAssignable = profile?.fallback_assignable === true;
    const preparedCharacterAssignable = profile?.prepared_character_profile === true;
    if (!profile || (!genericAssignable && !preparedCharacterAssignable)) {
      throw new Error(`PROFILE_ASSIGNMENT_INVALID: profil attribuable interdit ou inconnu ${assignment.profile_id}`);
    }
    if (preparedCharacterAssignable) {
      const actorPathSegments = targetPath.split(".").filter(Boolean);
      const actorKey = actorPathSegments[actorPathSegments.length - 1];
      const canonicalActorKeys = Array.isArray(profile.canonical_actor_keys)
        ? profile.canonical_actor_keys.filter((key): key is string => typeof key === "string")
        : [];
      if (!actorKey || !canonicalActorKeys.includes(actorKey)) {
        throw new Error(`PROFILE_ASSIGNMENT_INVALID: ${assignment.profile_id} ne correspond pas à ${assignment.target_ref}`);
      }
      if (assignment.basis !== "established_fiction") {
        throw new Error("PROFILE_ASSIGNMENT_INVALID: une fiche préparée nommée exige une présence établie");
      }
    }
    const classificationResolution = genericAssignable
      ? resolvedNpcClassification(context, assignment, targetPath)
      : undefined;
    if (genericAssignable && !classificationResolution) {
      throw new Error(`PROFILE_ASSIGNMENT_INVALID: npc_class doit être décidé avant le premier jet pour ${assignment.target_ref}`);
    }
    if (assignment.basis === "hidden_conception") {
      if (!genericAssignable || !classificationResolution
        || !HIDDEN_CONCEPTION_CLASSES.has(classificationResolution.classification.npc_class)) {
        throw new Error("PROFILE_ASSIGNMENT_INVALID: hidden_conception exige un PNJ important, mystérieux ou important_mysterious");
      }
      if (classificationResolution.allowed_profile_ids
        && !classificationResolution.allowed_profile_ids.includes(assignment.profile_id)) {
        throw new Error(`PROFILE_ASSIGNMENT_INVALID: ${assignment.profile_id} sort de l'enveloppe préparée de ${assignment.target_ref}`);
      }
      if (profile.rare_profile === true
        && (!classificationResolution.registry_authorized
          || !classificationResolution.allowed_profile_ids?.includes(assignment.profile_id))) {
        throw new Error("PROFILE_ASSIGNMENT_INVALID: un maître/champion exige une autorisation préparée explicite antérieure au jet");
      }
    }
    if (assignment.basis === "minimal_default" && profile.minimal_default_allowed !== true) {
      throw new Error("PROFILE_ASSIGNMENT_INVALID: seul le profil civil ordinaire peut servir de défaut minimal");
    }
    if (assignment.basis === "minimal_default" && classificationResolution
      && HIDDEN_CONCEPTION_CLASSES.has(classificationResolution.classification.npc_class)) {
      throw new Error("PROFILE_ASSIGNMENT_INVALID: un PNJ important ou mystérieux ne peut pas être déclaré faible par défaut");
    }
    if (!assignment.rationale?.trim() || assignment.rationale.length > 500) {
      throw new Error("PROFILE_ASSIGNMENT_INVALID: justification canonique absente ou trop longue");
    }
    if (!Array.isArray(assignment.evidence_refs) || assignment.evidence_refs.length < 1 || assignment.evidence_refs.length > 8
      || assignment.evidence_refs.some((reference) => typeof reference !== "string" || !reference.trim() || reference.length > 180)) {
      throw new Error("PROFILE_ASSIGNMENT_INVALID: une à huit références de preuve sont requises");
    }
    const minimumEvidenceRefs = typeof profile.minimum_evidence_refs === "number" ? profile.minimum_evidence_refs : 1;
    if (assignment.evidence_refs.length < minimumEvidenceRefs) {
      throw new Error(`PROFILE_ASSIGNMENT_INVALID: ${assignment.profile_id} exige au moins ${minimumEvidenceRefs} preuves établies`);
    }
    preparedAssignments.push({
      ...assignment,
      ...(classificationResolution ? { npc_classification: classificationResolution.classification } : {}),
    });
  }
  return preparedAssignments;
}

function resolveActor(context: CheckContext, actorRef: string, assignments: ProfileAssignment[]): ActorMechanics {
  const pendingAssignment = assignments.find((assignment) => assignment.target_ref === actorRef);
  const located = actorObject(context, actorRef);
  if (!located && !pendingAssignment) {
    throw new Error(`ACTOR_UNRESOLVED: statistiques canoniques absentes pour ${actorRef}`);
  }
  const actor = record(located?.object) || {};
  const direct = record(actor.mechanics) || record(actor.stats) || actor;
  const existingProfileId = direct.mechanical_profile_id || direct.profile_id || actor.mechanical_profile_id || actor.profile_id;
  if (pendingAssignment && typeof existingProfileId === "string" && existingProfileId !== pendingAssignment.profile_id) {
    throw new Error(`PROFILE_ASSIGNMENT_INVALID: ${actorRef} possède déjà le profil ${existingProfileId}`);
  }
  const profileId = existingProfileId || pendingAssignment?.profile_id;
  const profiles = record(context.mechanicalProfiles?.profiles) || {};
  const profile = typeof profileId === "string" ? record(profiles[profileId]) : undefined;
  if (typeof profileId === "string" && !profile) throw new Error(`ACTOR_UNRESOLVED: profil mécanique inconnu ${profileId}`);
  if (profile?.prepared_character_profile === true) {
    const actorPath = actorRef.replace(/^(current|world|hidden):/i, "");
    const actorSegments = actorPath.split(".").filter(Boolean);
    const actorKey = actorSegments[actorSegments.length - 1];
    const canonicalActorKeys = Array.isArray(profile.canonical_actor_keys)
      ? profile.canonical_actor_keys.filter((key): key is string => typeof key === "string")
      : [];
    const companionSheetIdentityMatches = actorRef.toLowerCase().startsWith("hidden:companion_sheets.")
      && actor.profile_id === profileId
      && typeof actor.character_key === "string"
      && canonicalActorKeys.includes(actor.character_key);
    if ((!actorKey || !canonicalActorKeys.includes(actorKey)) && !companionSheetIdentityMatches) {
      throw new Error(`ACTOR_UNRESOLVED: le profil nommé ${String(profileId)} ne correspond pas à ${actorRef}`);
    }
  }
  const profileMechanics = record(profile?.mechanics) || profile || {};
  const capabilities = { ...numericMap(profileMechanics.capabilities), ...numericMap(direct.capabilities) };
  const masteries = { ...numericMap(profileMechanics.masteries), ...numericMap(direct.masteries) };
  const defense = typeof direct.defense === "number"
    ? direct.defense
    : typeof profileMechanics.defense === "number" ? profileMechanics.defense : undefined;
  const mechanicsPresent = Object.keys(capabilities).length > 0 || Object.keys(masteries).length > 0 || typeof defense === "number";
  if ((!located || located.unresolved) && !pendingAssignment && !existingProfileId && !mechanicsPresent) {
    throw new Error(`ACTOR_UNRESOLVED: statistiques canoniques absentes pour ${actorRef}`);
  }
  return {
    actor_ref: actorRef,
    source: typeof profileId === "string"
      ? `${located?.source || actorRef} + reference/MECHANICAL_PROFILES.json#${profileId}${pendingAssignment ? " (attribution pré-jet)" : ""}`
      : located?.source || actorRef,
    capabilities,
    masteries,
    defense,
  };
}

function boundedInteger(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} doit être un entier entre ${min} et ${max}`);
  }
  return value;
}

function prepareCheck(context: CheckContext, request: CheckRequest): PreparedCheck {
  if (!/^[0-9a-f]{40}$/i.test(request.expected_head_sha)) throw new Error("expected_head_sha invalide");
  if (!/^VEY-\d{4}[A-Z]*$/.test(request.expected_save_id)) throw new Error("expected_save_id invalide");
  if (!request.action.trim()) throw new Error("action de test absente");
  const profileAssignments = prepareProfileAssignments(context, request);
  const actor = resolveActor(context, request.actor_ref, profileAssignments);
  const capabilityValue = actor.capabilities[request.capability];
  if (typeof capabilityValue !== "number") {
    throw new Error(`ACTOR_UNRESOLVED: capacité ${request.capability} absente pour ${request.actor_ref}`);
  }
  const masteryValue = actor.masteries[request.mastery] ?? 0;
  const modifiers = request.modifiers || [];
  if (modifiers.length > 10) throw new Error("trop de modificateurs pour un seul test");
  for (const modifier of modifiers) {
    if (!modifier.id?.trim() || !modifier.label?.trim() || !modifier.source?.trim()) throw new Error("modificateur incomplet");
    boundedInteger(modifier.value, `modificateur ${modifier.id}`, -10, 10);
  }
  const modifierTotal = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  let opposition: PreparedCheck["opposition"];
  if (request.opposition.kind === "difficulty") {
    opposition = {
      kind: "difficulty",
      visibility: request.opposition.visibility,
      value: boundedInteger(request.opposition.value, "difficulté", 1, 40),
      source: request.opposition.source,
    };
    if (!opposition.source.trim()) throw new Error("source de difficulté absente");
  } else {
    let target: ActorMechanics;
    try {
      target = resolveActor(context, request.opposition.target_ref, profileAssignments);
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/^ACTOR_UNRESOLVED:\s*/, "") : String(error);
      throw new Error(`OPPOSITION_UNRESOLVED: ${message}`);
    }
    if (request.opposition.kind === "defense") {
      if (typeof target.defense !== "number") {
        throw new Error(`OPPOSITION_UNRESOLVED: Défense absente pour ${request.opposition.target_ref}`);
      }
      opposition = {
        kind: "defense",
        visibility: "public",
        value: target.defense,
        source: target.source,
        target_ref: request.opposition.target_ref,
      };
    } else {
      const targetCapability = target.capabilities[request.opposition.capability];
      if (typeof targetCapability !== "number") {
        throw new Error(`OPPOSITION_UNRESOLVED: capacité ${request.opposition.capability} absente pour ${request.opposition.target_ref}`);
      }
      const targetMastery = request.opposition.mastery ? target.masteries[request.opposition.mastery] ?? 0 : 0;
      opposition = {
        kind: "derived",
        visibility: request.opposition.visibility,
        value: boundedInteger(request.opposition.base, "base d'opposition", 0, 30) + targetCapability + targetMastery,
        source: target.source,
        target_ref: request.opposition.target_ref,
      };
    }
  }
  return {
    request,
    actor,
    capability: { id: request.capability, value: capabilityValue },
    mastery: { id: request.mastery, value: masteryValue },
    modifiers,
    modifier_total: modifierTotal,
    profile_assignments: profileAssignments,
    opposition,
  };
}

function degreeForMargin(margin: number) {
  if (margin >= 5) return "strong_success";
  if (margin >= 0) return "success";
  if (margin <= -5) return "disaster";
  return "setback";
}

export function validateCheck(context: CheckContext, request: CheckRequest) {
  try {
    const prepared = prepareCheck(context, request);
    return {
      status: "ready" as const,
      fiction_advanced: false as const,
      expected_head_sha: request.expected_head_sha,
      expected_save_id: request.expected_save_id,
      actor: {
        actor_ref: prepared.actor.actor_ref,
        source: prepared.actor.source,
        capability: prepared.capability,
        mastery: prepared.mastery,
      },
      modifiers: prepared.modifiers,
      profile_assignments_required: prepared.profile_assignments,
      opposition: prepared.opposition.visibility === "hidden"
        ? { kind: prepared.opposition.kind, visibility: "hidden" as const, resolvable: true }
        : prepared.opposition,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = message.startsWith("OPPOSITION_UNRESOLVED")
      ? "OPPOSITION_UNRESOLVED"
      : message.startsWith("ACTOR_UNRESOLVED")
        ? "ACTOR_UNRESOLVED"
        : message.startsWith("PROFILE_ASSIGNMENT_INVALID") ? "PROFILE_ASSIGNMENT_INVALID" : "CHECK_INVALID";
    return { status: "unresolved" as const, code, message, fiction_advanced: false as const };
  }
}

export async function issueMechanicalCheck(context: CheckContext, request: CheckRequest, secret: string) {
  const prepared = prepareCheck(context, request);
  const roll = rollDice(2, 10, request.action);
  const requiredProfilePersistence: PersistedProfileAssignment[] = prepared.profile_assignments.map((assignment) => ({
    ...assignment,
    locked_by_roll_id: roll.roll_id,
    assigned_in_save_id: request.expected_save_id,
  }));
  const total = roll.dice_total + prepared.capability.value + prepared.mastery.value + prepared.modifier_total;
  const margin = total - prepared.opposition.value;
  const degree = degreeForMargin(margin);
  const gmResolution: Json = {
    actor_ref: prepared.actor.actor_ref,
    actor_source: prepared.actor.source,
    action: request.action,
    capability: prepared.capability,
    mastery: prepared.mastery,
    modifiers: prepared.modifiers,
    modifier_total: prepared.modifier_total,
    total,
    opposition: prepared.opposition,
    profile_assignments: requiredProfilePersistence,
    margin,
    degree,
  };
  const actorHidden = request.actor_visibility === "hidden";
  const oppositionHidden = prepared.opposition.visibility === "hidden";
  const publicTarget = oppositionHidden || actorHidden
    ? { visibility: "hidden" }
    : {
        visibility: "public",
        dd: prepared.opposition.value,
        comparison: "total_gte_dd",
        dice_total_required: prepared.opposition.value
          - prepared.capability.value
          - prepared.mastery.value
          - prepared.modifier_total,
      };
  const publicDisplay: Json = {
    action: request.action,
    actor_ref: actorHidden ? "hidden" : prepared.actor.actor_ref,
    notation: roll.notation,
    dice: roll.dice,
    dice_total: roll.dice_total,
    capability: actorHidden ? { visibility: "hidden" } : prepared.capability,
    mastery: actorHidden ? { visibility: "hidden" } : prepared.mastery,
    modifiers: actorHidden ? [] : prepared.modifiers.map(({ id, label, value }) => ({ id, label, value })),
    total: actorHidden ? "hidden" : total,
    opposition: oppositionHidden
      ? { visibility: "hidden" }
      : { kind: prepared.opposition.kind, visibility: "public", value: prepared.opposition.value },
    success_target: publicTarget,
    margin: oppositionHidden || actorHidden ? "hidden_publicly" : margin,
    degree: oppositionHidden || actorHidden ? "hidden_publicly" : degree,
  };
  const receiptPayload: MechanicalReceiptPayload = {
    version: 2,
    kind: "mechanical_check",
    expected_head_sha: request.expected_head_sha,
    expected_save_id: request.expected_save_id,
    roll_id: roll.roll_id,
    notation: roll.notation,
    dice: roll.dice,
    dice_total: roll.dice_total,
    generated_at: roll.generated_at,
    gm_resolution: gmResolution,
    public_display: publicDisplay,
    required_profile_persistence: requiredProfilePersistence,
  };
  const rollReceipt = await encryptJson(receiptPayload, secret, "veyrune:check-receipt:v1");
  return {
    roll_id: roll.roll_id,
    label: roll.label,
    notation: roll.notation,
    dice: roll.dice,
    dice_total: roll.dice_total,
    generated_at: roll.generated_at,
    expected_head_sha: request.expected_head_sha,
    expected_save_id: request.expected_save_id,
    fiction_advanced: false as const,
    mechanical_check: publicDisplay,
    gm_resolution: gmResolution,
    public_display: publicDisplay,
    required_profile_persistence: requiredProfilePersistence,
    roll_receipt: rollReceipt,
    signed_check: {
      roll_id: roll.roll_id,
      roll_receipt: rollReceipt,
    },
  };
}

function suppliedValue(event: Json, signed: Json | undefined, key: string, eventId: string) {
  const direct = event[key];
  const nested = signed?.[key];
  if (direct !== undefined && nested !== undefined && JSON.stringify(direct) !== JSON.stringify(nested)) {
    throw new Error(`${eventId}: signed_check contredit le champ ${key}`);
  }
  return direct ?? nested;
}

export async function normalizeAndVerifyEventCheckReceipts(
  events: Json[],
  secret: string,
  expectedHeadSha: string,
  expectedSaveId: string,
) {
  const seen = new Set<string>();
  const requiredProfilePersistence: PersistedProfileAssignment[] = [];
  const normalizedEvents: Json[] = [];
  for (const event of events) {
    const signed = record(event.signed_check);
    if (!("mechanical_check" in event) && !signed) {
      normalizedEvents.push(event);
      continue;
    }
    const eventId = String(event.event_id || "événement");
    const receipt = suppliedValue(event, signed, "roll_receipt", eventId);
    if (typeof receipt !== "string" || !receipt) {
      throw new Error(`${eventId}: roll_receipt absent du test mécanique; recopier signed_check depuis roll_check`);
    }
    const payload = await decryptJson<MechanicalReceiptPayload>(receipt, secret, "veyrune:check-receipt:v1");
    if (
      (payload.version !== 1 && payload.version !== 2)
      || payload.kind !== "mechanical_check"
      || payload.expected_head_sha !== expectedHeadSha
      || payload.expected_save_id !== expectedSaveId
    ) {
      throw new Error(`${eventId}: le reçu mécanique ne correspond pas au canon ou au tour attendu`);
    }
    const suppliedRollId = suppliedValue(event, signed, "roll_id", eventId);
    const suppliedNotation = suppliedValue(event, signed, "notation", eventId);
    const suppliedDice = suppliedValue(event, signed, "dice", eventId);
    const suppliedDiceTotal = suppliedValue(event, signed, "dice_total", eventId);
    const suppliedDisplay = suppliedValue(event, signed, "mechanical_check", eventId);
    if (
      (suppliedRollId !== undefined && suppliedRollId !== payload.roll_id)
      || (suppliedNotation !== undefined && suppliedNotation !== payload.notation)
      || (suppliedDice !== undefined && JSON.stringify(suppliedDice) !== JSON.stringify(payload.dice))
      || (suppliedDiceTotal !== undefined && suppliedDiceTotal !== payload.dice_total)
      || (suppliedDisplay !== undefined && JSON.stringify(suppliedDisplay) !== JSON.stringify(payload.public_display))
    ) {
      throw new Error(`${eventId}: le test mécanique ne correspond pas à son reçu serveur`);
    }
    if (seen.has(payload.roll_id)) throw new Error(`roll_id mécanique réutilisé dans le tour: ${payload.roll_id}`);
    seen.add(payload.roll_id);
    for (const assignment of payload.required_profile_persistence || []) {
      if (
        assignment.locked_by_roll_id !== payload.roll_id
        || assignment.assigned_in_save_id !== expectedSaveId
        || !assignment.target_ref.startsWith("hidden:")
      ) {
        throw new Error(`${eventId}: attribution de profil invalide dans le reçu`);
      }
      requiredProfilePersistence.push(assignment);
    }
    const normalized = { ...event };
    delete normalized.signed_check;
    normalized.roll_id = payload.roll_id;
    normalized.notation = payload.notation;
    normalized.dice = payload.dice;
    normalized.dice_total = payload.dice_total;
    normalized.roll_receipt = receipt;
    normalized.mechanical_check = payload.public_display;
    normalizedEvents.push(normalized);
  }
  return { events: normalizedEvents, requiredProfilePersistence };
}

export async function verifyEventCheckReceipts(
  events: Json[],
  secret: string,
  expectedHeadSha: string,
  expectedSaveId: string,
) {
  const result = await normalizeAndVerifyEventCheckReceipts(events, secret, expectedHeadSha, expectedSaveId);
  return result.requiredProfilePersistence;
}

function collectMechanicalProfiles(root: unknown, path = "", result = new Map<string, string>()) {
  const object = record(root);
  if (!object) return result;
  if (typeof object.mechanical_profile_id === "string") result.set(path, object.mechanical_profile_id);
  for (const [key, value] of Object.entries(object)) {
    if (key === "mechanical_profile_assignment") continue;
    if (record(value)) collectMechanicalProfiles(value, path ? `${path}.${key}` : key, result);
  }
  return result;
}

function collectNpcClassifications(root: unknown, path = "", result = new Map<string, string>()) {
  const object = record(root);
  if (!object) return result;
  if (typeof object.npc_class === "string") {
    result.set(path, JSON.stringify({ npc_class: object.npc_class, npc_classification: object.npc_classification }));
  }
  for (const [key, value] of Object.entries(object)) {
    if (["mechanical_profile_assignment", "npc_classification"].includes(key)) continue;
    if (record(value)) collectNpcClassifications(value, path ? `${path}.${key}` : key, result);
  }
  return result;
}

export function verifyPersistedProfileAssignments(
  requiredAssignments: PersistedProfileAssignment[],
  baseHiddenValue: unknown,
  nextHiddenValue: unknown,
) {
  const baseHidden = record(baseHiddenValue) || {};
  const nextHidden = record(nextHiddenValue) || {};
  const before = collectMechanicalProfiles(baseHidden);
  const after = collectMechanicalProfiles(nextHidden);
  const beforeClasses = collectNpcClassifications(baseHidden);
  const afterClasses = collectNpcClassifications(nextHidden);
  const requiredByPath = new Map<string, PersistedProfileAssignment>();
  for (const assignment of requiredAssignments) {
    const path = assignment.target_ref.replace(/^hidden:/, "");
    const existing = requiredByPath.get(path);
    if (existing && existing.profile_id !== assignment.profile_id) {
      throw new Error(`attributions mécaniques contradictoires pour hidden:${path}`);
    }
    requiredByPath.set(path, assignment);
  }
  for (const [path, profileId] of before) {
    if (after.get(path) !== profileId) throw new Error(`réattribution ou suppression interdite du profil mécanique hidden:${path}`);
  }
  for (const [path, profileId] of after) {
    if (before.has(path)) continue;
    const required = requiredByPath.get(path);
    if (!required || required.profile_id !== profileId) {
      throw new Error(`nouveau profil mécanique non autorisé par un roll_check: hidden:${path}`);
    }
  }
  for (const [path, classification] of beforeClasses) {
    if (afterClasses.get(path) !== classification) {
      throw new Error(`reclassement ou suppression interdite du npc_class hidden:${path}`);
    }
  }
  for (const [path, classification] of afterClasses) {
    if (beforeClasses.has(path)) continue;
    const required = requiredByPath.get(path);
    const requiredClassification = required?.npc_classification;
    if (!requiredClassification || classification !== JSON.stringify({
      npc_class: requiredClassification.npc_class,
      npc_classification: requiredClassification,
    })) {
      throw new Error(`nouveau npc_class non autorisé par un roll_check: hidden:${path}`);
    }
  }
  for (const [path, assignment] of requiredByPath) {
    const actor = record(valueAt(nextHidden, path));
    if (!actor || actor.mechanical_profile_id !== assignment.profile_id
      || JSON.stringify(actor.mechanical_profile_assignment) !== JSON.stringify(assignment)) {
      throw new Error(`save_turn doit persister exactement l'attribution signée pour hidden:${path}`);
    }
    if (assignment.npc_classification
      && (actor.npc_class !== assignment.npc_classification.npc_class
        || JSON.stringify(actor.npc_classification) !== JSON.stringify(assignment.npc_classification))) {
      throw new Error(`save_turn doit persister exactement le npc_class signé pour hidden:${path}`);
    }
  }
}

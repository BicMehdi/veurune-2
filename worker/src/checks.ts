import { rollDice } from "./dice.ts";
import { decryptJson, encryptJson } from "./receipt.ts";

type Json = Record<string, unknown>;

export type CheckModifier = {
  id: string;
  label: string;
  value: number;
  source: string;
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
  opposition: {
    kind: CheckOpposition["kind"];
    visibility: "public" | "hidden";
    value: number;
    source: string;
    target_ref?: string;
  };
};

type MechanicalReceiptPayload = {
  version: 1;
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

function actorObject(context: CheckContext, actorRef: string) {
  if (actorRef.toLowerCase() === "mehdi") return { object: context.mehdiSheet, source: "state/MEHDI_SHEET.yaml" };
  const match = actorRef.match(/^(current|world|hidden):(.+)$/i);
  if (!match) return undefined;
  const rootName = match[1].toLowerCase() as "current" | "world" | "hidden";
  const path = match[2];
  if (rootName === "hidden" && unresolvedPath(context.hidden, path)) return { unresolved: true, source: `state/HIDDEN.yaml#${path}` };
  return { object: valueAt(context[rootName], path), source: `state/${rootName.toUpperCase()}.yaml#${path}` };
}

function resolveActor(context: CheckContext, actorRef: string): ActorMechanics {
  const located = actorObject(context, actorRef);
  if (!located || "unresolved" in located || !record(located.object)) {
    throw new Error(`ACTOR_UNRESOLVED: statistiques canoniques absentes pour ${actorRef}`);
  }
  const actor = record(located.object)!;
  const direct = record(actor.mechanics) || record(actor.stats) || actor;
  const profileId = direct.mechanical_profile_id || direct.profile_id || actor.mechanical_profile_id || actor.profile_id;
  const profiles = record(context.mechanicalProfiles?.profiles) || {};
  const profile = typeof profileId === "string" ? record(profiles[profileId]) : undefined;
  if (typeof profileId === "string" && !profile) throw new Error(`ACTOR_UNRESOLVED: profil mécanique inconnu ${profileId}`);
  const profileMechanics = record(profile?.mechanics) || profile || {};
  const capabilities = { ...numericMap(profileMechanics.capabilities), ...numericMap(direct.capabilities) };
  const masteries = { ...numericMap(profileMechanics.masteries), ...numericMap(direct.masteries) };
  const defense = typeof direct.defense === "number"
    ? direct.defense
    : typeof profileMechanics.defense === "number" ? profileMechanics.defense : undefined;
  return {
    actor_ref: actorRef,
    source: typeof profileId === "string" ? `${located.source} + reference/MECHANICAL_PROFILES.json#${profileId}` : located.source,
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
  const actor = resolveActor(context, request.actor_ref);
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
      target = resolveActor(context, request.opposition.target_ref);
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
        visibility: request.opposition.visibility,
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
      opposition: prepared.opposition.visibility === "hidden"
        ? { kind: prepared.opposition.kind, visibility: "hidden" as const, resolvable: true }
        : prepared.opposition,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = message.startsWith("OPPOSITION_UNRESOLVED")
      ? "OPPOSITION_UNRESOLVED"
      : message.startsWith("ACTOR_UNRESOLVED") ? "ACTOR_UNRESOLVED" : "CHECK_INVALID";
    return { status: "unresolved" as const, code, message, fiction_advanced: false as const };
  }
}

export async function issueMechanicalCheck(context: CheckContext, request: CheckRequest, secret: string) {
  const prepared = prepareCheck(context, request);
  const roll = rollDice(2, 10, request.action);
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
    margin,
    degree,
  };
  const actorHidden = request.actor_visibility === "hidden";
  const oppositionHidden = prepared.opposition.visibility === "hidden";
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
    margin: oppositionHidden || actorHidden ? "hidden_publicly" : margin,
    degree: oppositionHidden || actorHidden ? "hidden_publicly" : degree,
  };
  const receiptPayload: MechanicalReceiptPayload = {
    version: 1,
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
  };
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
    roll_receipt: await encryptJson(receiptPayload, secret, "veyrune:check-receipt:v1"),
  };
}

export async function verifyEventCheckReceipts(
  events: Json[],
  secret: string,
  expectedHeadSha: string,
  expectedSaveId: string,
) {
  const seen = new Set<string>();
  for (const event of events) {
    if (!("mechanical_check" in event)) continue;
    if (typeof event.roll_id !== "string" || typeof event.notation !== "string" || !Array.isArray(event.dice) || typeof event.roll_receipt !== "string" || !record(event.mechanical_check)) {
      throw new Error(`${String(event.event_id || "événement")}: test mécanique signé incomplet`);
    }
    if (seen.has(event.roll_id)) throw new Error(`roll_id mécanique réutilisé dans le tour: ${event.roll_id}`);
    seen.add(event.roll_id);
    const payload = await decryptJson<MechanicalReceiptPayload>(event.roll_receipt, secret, "veyrune:check-receipt:v1");
    if (
      payload.version !== 1
      || payload.kind !== "mechanical_check"
      || payload.expected_head_sha !== expectedHeadSha
      || payload.expected_save_id !== expectedSaveId
      || payload.roll_id !== event.roll_id
      || payload.notation !== event.notation
      || JSON.stringify(payload.dice) !== JSON.stringify(event.dice)
      || ("dice_total" in event && payload.dice_total !== event.dice_total)
      || JSON.stringify(payload.public_display) !== JSON.stringify(event.mechanical_check)
    ) {
      throw new Error(`${String(event.event_id || "événement")}: le test mécanique ne correspond pas à son reçu serveur`);
    }
  }
}

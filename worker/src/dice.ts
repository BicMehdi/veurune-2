export type DiceRoll = {
  roll_id: string;
  label: string | null;
  notation: string;
  dice: number[];
  dice_total: number;
  generated_at: string;
  fiction_advanced: false;
};

export type SignedDiceRoll = DiceRoll & {
  expected_head_sha: string;
  expected_save_id: string;
  roll_receipt: string;
};

function secureDie(sides: number) {
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / sides) * sides;
  const buffer = new Uint32Array(1);
  do crypto.getRandomValues(buffer); while (buffer[0] >= limit);
  return (buffer[0] % sides) + 1;
}

export function rollDice(count: number, sides: number, label?: string): DiceRoll {
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error("count doit être compris entre 1 et 10");
  if (!Number.isInteger(sides) || sides < 2 || sides > 100) throw new Error("sides doit être compris entre 2 et 100");
  const dice = Array.from({ length: count }, () => secureDie(sides));
  return {
    roll_id: crypto.randomUUID(),
    label: label || null,
    notation: `${count}d${sides}`,
    dice,
    dice_total: dice.reduce((sum, die) => sum + die, 0),
    generated_at: new Date().toISOString(),
    fiction_advanced: false,
  };
}

type ReceiptPayload = {
  version: 1;
  roll_id: string;
  notation: string;
  dice: number[];
  dice_total: number;
  generated_at: string;
  expected_head_sha: string;
  expected_save_id: string;
};

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function hmacKey(secret: string) {
  if (!secret) throw new Error("clé de reçu de jet absente");
  const derived = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`veyrune:dice-receipt:v1:${secret}`),
  );
  return crypto.subtle.importKey(
    "raw",
    derived,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function issueDiceRoll(
  count: number,
  sides: number,
  label: string | undefined,
  expectedHeadSha: string,
  expectedSaveId: string,
  secret: string,
): Promise<SignedDiceRoll> {
  if (!/^[0-9a-f]{40}$/i.test(expectedHeadSha)) throw new Error("expected_head_sha invalide");
  if (!/^VEY-\d{4}[A-Z]*$/.test(expectedSaveId)) throw new Error("expected_save_id invalide");
  const roll = rollDice(count, sides, label);
  const payload: ReceiptPayload = {
    version: 1,
    roll_id: roll.roll_id,
    notation: roll.notation,
    dice: roll.dice,
    dice_total: roll.dice_total,
    generated_at: roll.generated_at,
    expected_head_sha: expectedHeadSha,
    expected_save_id: expectedSaveId,
  };
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(encodedPayload)));
  return {
    ...roll,
    expected_head_sha: expectedHeadSha,
    expected_save_id: expectedSaveId,
    roll_receipt: `${encodedPayload}.${bytesToBase64Url(signature)}`,
  };
}

async function verifyReceipt(receipt: string, secret: string): Promise<ReceiptPayload> {
  const [encodedPayload, encodedSignature, extra] = receipt.split(".");
  if (!encodedPayload || !encodedSignature || extra) throw new Error("reçu de jet invalide");
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(encodedPayload),
  );
  if (!valid) throw new Error("signature du reçu de jet invalide");
  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as ReceiptPayload;
  if (payload.version !== 1 || !Array.isArray(payload.dice)) throw new Error("contenu du reçu de jet invalide");
  return payload;
}

export async function verifyEventRollReceipts(
  events: Array<Record<string, unknown>>,
  secret: string,
  expectedHeadSha: string,
  expectedSaveId: string,
) {
  const seen = new Set<string>();
  for (const event of events) {
    const hasRoll = "dice" in event || "roll_id" in event || "roll_receipt" in event;
    if (!hasRoll) continue;
    if (typeof event.roll_id !== "string" || typeof event.notation !== "string" || !Array.isArray(event.dice) || typeof event.roll_receipt !== "string") {
      throw new Error(`${String(event.event_id || "événement")}: jet incomplet; roll_id, notation, dice et roll_receipt sont obligatoires`);
    }
    if (seen.has(event.roll_id)) throw new Error(`roll_id réutilisé dans le tour: ${event.roll_id}`);
    seen.add(event.roll_id);
    const payload = await verifyReceipt(event.roll_receipt, secret);
    if (
      payload.roll_id !== event.roll_id
      || payload.notation !== event.notation
      || JSON.stringify(payload.dice) !== JSON.stringify(event.dice)
      || ("dice_total" in event && payload.dice_total !== event.dice_total)
      || payload.expected_head_sha !== expectedHeadSha
      || payload.expected_save_id !== expectedSaveId
    ) {
      throw new Error(`${String(event.event_id || "événement")}: le jet ne correspond pas à son reçu serveur`);
    }
  }
}

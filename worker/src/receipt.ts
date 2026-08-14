function bytesToBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function derivedBytes(secret: string, domain: string) {
  if (!secret) throw new Error("clé de reçu absente");
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${domain}:${secret}`));
}

async function compress(bytes: Uint8Array) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(bytes: Uint8Array) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function signJson(value: unknown, secret: string, domain: string) {
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
  const key = await crypto.subtle.importKey(
    "raw",
    await derivedBytes(secret, domain),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload)));
  return `${encodedPayload}.${bytesToBase64Url(signature)}`;
}

export async function verifySignedJson<T>(receipt: string, secret: string, domain: string): Promise<T> {
  const [encodedPayload, encodedSignature, extra] = receipt.split(".");
  if (!encodedPayload || !encodedSignature || extra) throw new Error("reçu signé invalide");
  const key = await crypto.subtle.importKey(
    "raw",
    await derivedBytes(secret, domain),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(encodedPayload),
  );
  if (!valid) throw new Error("signature du reçu invalide");
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as T;
}

export async function encryptJson(value: unknown, secret: string, domain: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    await derivedBytes(secret, domain),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await compress(new TextEncoder().encode(JSON.stringify(value)));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  ));
  return `v2.${bytesToBase64Url(iv)}.${bytesToBase64Url(ciphertext)}`;
}

export async function decryptJson<T>(receipt: string, secret: string, domain: string): Promise<T> {
  const [version, encodedIv, encodedCiphertext, extra] = receipt.split(".");
  if ((version !== "v1" && version !== "v2") || !encodedIv || !encodedCiphertext || extra) {
    throw new Error("reçu chiffré invalide");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    await derivedBytes(secret, domain),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  try {
    const decrypted = new Uint8Array(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(encodedIv) },
      key,
      base64UrlToBytes(encodedCiphertext),
    ));
    const plaintext = version === "v2" ? await decompress(decrypted) : decrypted;
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    throw new Error("authenticité du reçu chiffré invalide");
  }
}

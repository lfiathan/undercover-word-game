/**
 * Room keys and payload encryption.
 *
 * The public brokers we relay through are, well, public: anyone can subscribe
 * to a wildcard topic and watch traffic go by. So nothing readable ever
 * leaves the browser. From the room code we derive, with one slow KDF pass:
 *
 *   - a topic id   -> which topic the room talks on
 *   - an AES key   -> every payload is AES-256-GCM encrypted
 *
 * A sniffer therefore sees an opaque topic carrying opaque bytes. Working
 * back to the key means brute forcing the 6 character code space through
 * 310k PBKDF2 iterations per guess. For a party game's secret words that is
 * far more than enough; see README for the threat model.
 */

const KDF_ITERATIONS = 310_000;
const TOPIC_ID_BYTES = 10;
const KEY_BYTES = 32;
const IV_BYTES = 12;

const SALT =
  (import.meta.env.VITE_ROOM_SALT as string) ||
  "undercover-word-game|relay|v1";

export type RoomKeys = {
  code: string;
  topicId: string;
  key: CryptoKey;
};

const cache = new Map<string, Promise<RoomKeys>>();

function assertSubtleCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Web Crypto is unavailable. Open the game over https:// or on localhost.",
    );
  }
  return globalThis.crypto.subtle;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function derive(code: string): Promise<RoomKeys> {
  const subtle = assertSubtleCrypto();
  const encoder = new TextEncoder();

  const baseKey = await subtle.importKey(
    "raw",
    encoder.encode(code),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(SALT),
      iterations: KDF_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    (TOPIC_ID_BYTES + KEY_BYTES) * 8,
  );

  const material = new Uint8Array(bits);
  const topicId = toHex(material.slice(0, TOPIC_ID_BYTES));
  const key = await subtle.importKey(
    "raw",
    material.slice(TOPIC_ID_BYTES),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

  return { code, topicId, key };
}

/** Derive (and memoise) the keys for a room code. */
export function deriveRoom(code: string): Promise<RoomKeys> {
  const existing = cache.get(code);
  if (existing) return existing;
  const pending = derive(code).catch((err) => {
    cache.delete(code);
    throw err;
  });
  cache.set(code, pending);
  return pending;
}

export async function encryptJson(
  room: RoomKeys,
  value: unknown,
): Promise<Uint8Array> {
  const subtle = assertSubtleCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = new Uint8Array(
    await subtle.encrypt({ name: "AES-GCM", iv }, room.key, plaintext),
  );
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv, 0);
  packed.set(ciphertext, iv.length);
  return packed;
}

/** Returns null for anything we cannot authenticate: wrong room, junk, noise. */
export async function decryptJson<T>(
  room: RoomKeys,
  packed: Uint8Array,
): Promise<T | null> {
  try {
    const subtle = assertSubtleCrypto();
    if (packed.length <= IV_BYTES) return null;
    const iv = packed.slice(0, IV_BYTES);
    const ciphertext = packed.slice(IV_BYTES);
    const plaintext = await subtle.decrypt(
      { name: "AES-GCM", iv },
      room.key,
      ciphertext,
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    return null;
  }
}

export { bytesToBase64, base64ToBytes };

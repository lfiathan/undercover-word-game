/**
 * Short, human friendly room codes.
 *
 * Crockford base32: no I, L, O or U, so there is nothing to confuse with 1,
 * 0 or each other, and no accidental rude words. 6 characters gives about
 * 1.07 billion codes, which is plenty of room for guess resistance given a
 * code only lives as long as one game night.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(): string {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return code;
}

/**
 * Clean up whatever the player pasted or typed: a bare code, a code with
 * spaces or dashes, lower case, or a whole invite link. Also folds the
 * Crockford look-alikes (O to 0, I/L to 1) so a mistyped code still works.
 */
export function normalizeRoomCode(input: string): string {
  if (!input) return "";

  let raw = input.trim();

  // Pull the code out of a pasted invite link.
  const fromQuery = raw.match(/[?&]gameId=([^&#\s]+)/i);
  if (fromQuery) raw = decodeURIComponent(fromQuery[1]);

  return raw
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/U/g, "V")
    .split("")
    .filter((c) => ALPHABET.includes(c))
    .join("")
    .slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && normalizeRoomCode(code) === code;
}

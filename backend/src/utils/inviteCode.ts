import { randomInt } from "node:crypto";

// Sem caracteres que se confundem (0/O, 1/I): o código é digitado à mão quando o link não abre.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  return Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

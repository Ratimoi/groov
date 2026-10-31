import { randomInt } from "node:crypto";

// Sem 0/O/1/I para o código ser legível quando digitado na portaria.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 12;

export function generateTicketCode(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return `GRV-${code}`;
}

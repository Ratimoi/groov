import type { SignOptions } from "jsonwebtoken";

export const MIN_JWT_SECRET_LENGTH = 32;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET precisa estar definido com pelo menos ${MIN_JWT_SECRET_LENGTH} caracteres`);
  }
  return secret;
}

export function getJwtExpiresIn(): SignOptions["expiresIn"] {
  return (process.env.JWT_EXPIRES_IN ?? "1d") as SignOptions["expiresIn"];
}

// Chamado na inicialização: sem segredo válido a API não deve subir.
export function assertAuthConfig(): void {
  getJwtSecret();
}

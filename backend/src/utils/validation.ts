import { AppError } from "./AppError";

export function fail(message: string): never {
  throw new AppError(message, 400);
}

export function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) fail("O corpo deve ser um objeto JSON");
  return body as Record<string, unknown>;
}

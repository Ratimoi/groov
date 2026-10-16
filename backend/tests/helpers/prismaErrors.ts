import { Prisma } from "@prisma/client";

export function prismaError(code: string, meta?: Record<string, unknown>): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("erro simulado", { code, clientVersion: "test", meta });
}

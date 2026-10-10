import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({ message: "Informação já existe, viola restrição de unicidade", fields: error.meta?.target });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Erro interno do servidor" });
}

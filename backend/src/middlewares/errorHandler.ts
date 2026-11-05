import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({ message: "Informação já existe, viola restrição de unicidade", fields: error.meta?.target });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    if (req.method === "DELETE") {
      res.status(409).json({ message: "Registro possui dependências e não pode ser removido", constraint: error.meta?.constraint });
      return;
    }
    res.status(400).json({ message: "Referência a registro inexistente", constraint: error.meta?.constraint });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Erro interno do servidor" });
}

import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

const JANELA_MS = 60 * 60 * 1000;
const MAXIMO = 10;
const publicacoes = new Map<string, number[]>();

// Freio simples contra spam: no máximo 10 eventos publicados por hora por usuário (em memória).
export function publishLimiter(req: Request, _res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === "test") return next();
  const chave = req.user?.id ?? req.ip ?? "anon";
  const agora = Date.now();
  const recentes = (publicacoes.get(chave) ?? []).filter((t) => agora - t < JANELA_MS);
  if (recentes.length >= MAXIMO) {
    return next(new AppError("Limite de publicações atingido. Tente novamente mais tarde.", 429));
  }
  recentes.push(agora);
  publicacoes.set(chave, recentes);
  next();
}

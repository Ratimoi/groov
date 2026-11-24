import type { NextFunction, Request, Response } from "express";
import { UserModel } from "../models/UserModel";
import type { AuthUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { verifyToken } from "../utils/token";

const userModel = new UserModel();

// Exige `Authorization: Bearer <token>` e carrega o usuário atual em `req.user`.
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      throw new AppError("Token de autenticação ausente", 401);
    }

    const user = await userModel.findById(verifyToken(token));
    if (!user) {
      throw new AppError("Token inválido ou expirado", 401);
    }

    req.user = { id: user.id, podeResetarSeed: user.podeResetarSeed };
    next();
  } catch (error) {
    next(error);
  }
}

// Usuário logado da requisição. Só vale em rotas atrás de `authenticate`.
export function getAuthUser(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError("Token de autenticação ausente", 401);
  }
  return req.user;
}

// Só contas liberadas direto no banco (`podeResetarSeed`). Usar depois de `authenticate`.
export function requireSeedReset(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.podeResetarSeed) {
    next(new AppError("Acesso negado", 403));
    return;
  }
  next();
}

// Só o próprio usuário (`:id` da rota). Usar depois de `authenticate`.
export function authorizeSelf(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.id !== req.params.id) {
    next(new AppError("Acesso negado", 403));
    return;
  }
  next();
}

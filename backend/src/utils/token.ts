import jwt from "jsonwebtoken";
import { getJwtExpiresIn, getJwtSecret } from "../config/auth";
import { AppError } from "./AppError";

const ALGORITHM = "HS256";

// O token carrega só o id do usuário (claim `sub`). O papel é lido do banco a cada requisição,
// assim um usuário apagado ou rebaixado perde o acesso sem esperar o token expirar.
export function signToken(userId: string): string {
  return jwt.sign({}, getJwtSecret(), { subject: userId, expiresIn: getJwtExpiresIn(), algorithm: ALGORITHM });
}

export function verifyToken(token: string): string {
  try {
    // `algorithms` fixo impede que o token escolha o algoritmo (ex.: "none").
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: [ALGORITHM] });
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      throw new jwt.JsonWebTokenError("token sem sub");
    }
    return payload.sub;
  } catch (error) {
    // Só erros do próprio token viram 401; configuração ausente continua sendo erro do servidor.
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError("Token inválido ou expirado", 401);
    }
    throw error;
  }
}

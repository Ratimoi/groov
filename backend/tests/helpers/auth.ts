import type { Papel } from "@prisma/client";
import { signToken } from "../../src/utils/token";
import { prismaMock } from "./prismaMock";

export function bearer(userId = "u1"): { Authorization: string } {
  return { Authorization: `Bearer ${signToken(userId)}` };
}

// O middleware `authenticate` lê o usuário (e o papel) do banco a cada requisição.
// Use quando o teste não consulta `usuario.findUnique` por outro motivo.
export function logadoComo(papel: Papel = "CLIENTE", id = "u1"): { Authorization: string } {
  prismaMock.usuario.findUnique.mockResolvedValue({ id, papel });
  return bearer(id);
}

// Versão para testes que também usam `usuario.findUnique` na própria rota: vale só para a
// primeira chamada (a do middleware); a seguinte continua programável pelo teste.
export function logadoUmaVezComo(papel: Papel = "CLIENTE", id = "u1"): { Authorization: string } {
  prismaMock.usuario.findUnique.mockResolvedValueOnce({ id, papel });
  return bearer(id);
}

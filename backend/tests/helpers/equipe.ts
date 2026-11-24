import type { FuncaoEvento } from "@prisma/client";
import { prismaMock } from "./prismaMock";

// Programa a função de cada usuário no evento (quem não está no mapa não é da equipe).
export function programaEquipe(funcoes: Record<string, FuncaoEvento>): void {
  prismaMock.membroEvento.findUnique.mockImplementation(
    async ({ where }: { where: { eventoId_usuarioId: { usuarioId: string } } }) => {
      const funcao = funcoes[where.eventoId_usuarioId.usuarioId];
      return funcao ? { funcao } : null;
    },
  );
}

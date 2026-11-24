import type { FuncaoEvento } from "@prisma/client";
import { AppError } from "./AppError";

// Não existe administrador geral: cada pessoa só pode o que a sua função no evento permite.
export type Permissao =
  | "EDITAR_EVENTO"
  | "APAGAR_EVENTO"
  | "GERENCIAR_LOTES"
  | "GERENCIAR_EQUIPE"
  | "VALIDAR_INGRESSO"
  | "VER_DASHBOARD"
  | "VER_RECEITA";

export const PERMISSOES_POR_FUNCAO: Record<FuncaoEvento, readonly Permissao[]> = {
  DONO: [
    "EDITAR_EVENTO",
    "APAGAR_EVENTO",
    "GERENCIAR_LOTES",
    "GERENCIAR_EQUIPE",
    "VALIDAR_INGRESSO",
    "VER_DASHBOARD",
    "VER_RECEITA",
  ],
  PRODUTOR: ["EDITAR_EVENTO", "GERENCIAR_LOTES", "VALIDAR_INGRESSO", "VER_DASHBOARD", "VER_RECEITA"],
  PORTEIRO: ["VALIDAR_INGRESSO", "VER_DASHBOARD"],
};

export function podeNoEvento(funcao: FuncaoEvento | null, permissao: Permissao): boolean {
  return funcao !== null && PERMISSOES_POR_FUNCAO[funcao].includes(permissao);
}

// Eventos são públicos para leitura, então quem não pode gerenciar recebe 403, e não 404.
export function assertPodeNoEvento(funcao: FuncaoEvento | null, permissao: Permissao): void {
  if (!podeNoEvento(funcao, permissao)) {
    throw new AppError("Você não tem permissão para isso neste evento", 403);
  }
}

import type { Grupo } from "@prisma/client";
import type { GroupMember } from "../models/GroupMemberModel";
import type { AuthUser } from "./auth";

export type { GroupMember };

// Dados do model: o líder é sempre o usuário logado, nunca vem do corpo da requisição.
export type GroupCreateRequest = {
  nome: string;
  liderId: string;
};

export type GroupCreateBody = Pick<GroupCreateRequest, "nome">;

export type GroupUpdateRequest = {
  nome?: string;
};

export type GroupMemberCreateRequest = {
  usuarioId: string;
};

// Todas as operações recebem quem as executa (`actor`) e aplicam as regras de acesso.
// Grupos que o usuário não enxerga se comportam como inexistentes (404), sem revelar que existem.
export interface GroupServiceContract {
  create(data: GroupCreateBody, actor: AuthUser): Promise<Grupo>;
  findAll(actor: AuthUser): Promise<Grupo[]>;
  findById(id: string, actor: AuthUser): Promise<Grupo | null>;
  update(id: string, data: GroupUpdateRequest, actor: AuthUser): Promise<Grupo | null>;
  delete(id: string, actor: AuthUser): Promise<boolean>;
  listMembers(grupoId: string, actor: AuthUser): Promise<GroupMember[]>;
  addMember(grupoId: string, data: GroupMemberCreateRequest, actor: AuthUser): Promise<GroupMember>;
  removeMember(grupoId: string, usuarioId: string, actor: AuthUser): Promise<void>;
}

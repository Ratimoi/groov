import type { Grupo } from "@prisma/client";
import type { GroupMember } from "../models/GroupMemberModel";

export type { GroupMember };

export type GroupCreateRequest = {
  nome: string;
  liderId: string;
};

export type GroupUpdateRequest = {
  nome?: string;
};

export type GroupMemberCreateRequest = {
  usuarioId: string;
};

export interface GroupServiceContract {
  create(data: GroupCreateRequest): Promise<Grupo>;
  findAll(): Promise<Grupo[]>;
  findById(id: string): Promise<Grupo | null>;
  update(id: string, data: GroupUpdateRequest): Promise<Grupo | null>;
  delete(id: string): Promise<boolean>;
  listMembers(grupoId: string): Promise<GroupMember[]>;
  addMember(grupoId: string, data: GroupMemberCreateRequest): Promise<GroupMember>;
  removeMember(grupoId: string, usuarioId: string): Promise<void>;
}

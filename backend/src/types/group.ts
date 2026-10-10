import type { Grupo } from "@prisma/client";

export type GroupCreateRequest = {
  nome: string;
  liderId: string;
};

export type GroupUpdateRequest = Partial<GroupCreateRequest>;

export interface GroupServiceContract {
  create(data: GroupCreateRequest): Promise<Grupo>;
  findAll(): Promise<Grupo[]>;
  findById(id: string): Promise<Grupo | null>;
  update(id: string, data: GroupUpdateRequest): Promise<Grupo | null>;
  delete(id: string): Promise<boolean>;
}
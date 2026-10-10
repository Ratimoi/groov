import type { Papel, Usuario } from "@prisma/client";

export type UserCreateRequest = {
  nome: string;
  username: string;
  email: string;
  senha: string;
  avatarUrl?: string | null;
  papel?: Papel;
};

export type UserUpdateRequest = Partial<UserCreateRequest>;

export interface UserServiceContract {
  create(data: UserCreateRequest): Promise<Usuario>;
  findAll(): Promise<Usuario[]>;
  findById(id: string): Promise<Usuario | null>;
  update(id: string, data: UserUpdateRequest): Promise<Usuario | null>;
  delete(id: string): Promise<boolean>;
}

import type { Usuario } from "@prisma/client";

// Usuário como a API o expõe: nunca inclui a senha (nem o hash) nem o CPF.
export type PublicUser = Omit<Usuario, "senha" | "cpf">;

export type UserCreateRequest = {
  nome: string;
  username: string;
  email: string;
  senha: string;
  cpf: string;
  avatarUrl?: string | null;
};

export type UserUpdateRequest = Partial<UserCreateRequest>;

// O que a busca de usuários devolve: só dados públicos, nunca e-mail ou senha.
export type UserSearchResult = Pick<Usuario, "id" | "nome" | "username" | "avatarUrl">;

export interface UserServiceContract {
  create(data: UserCreateRequest): Promise<PublicUser>;
  findById(id: string): Promise<PublicUser | null>;
  search(termo: unknown, actorId: string): Promise<UserSearchResult[]>;
  update(id: string, data: UserUpdateRequest): Promise<PublicUser | null>;
  delete(id: string): Promise<boolean>;
}

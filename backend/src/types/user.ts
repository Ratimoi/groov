import type { Papel, Usuario } from "@prisma/client";

// Usuário como a API o expõe: nunca inclui a senha (nem o hash) nem o CPF.
export type PublicUser = Omit<Usuario, "senha" | "cpf">;

// O papel não faz parte do cadastro: todo novo usuário é CLIENTE.
export type UserCreateRequest = {
  nome: string;
  username: string;
  email: string;
  senha: string;
  cpf: string;
  avatarUrl?: string | null;
};

export type UserUpdateRequest = Partial<UserCreateRequest> & { papel?: Papel };

// O que a busca de usuários devolve: só dados públicos, nunca e-mail, papel ou senha.
export type UserSearchResult = Pick<Usuario, "id" | "nome" | "username" | "avatarUrl">;

export interface UserServiceContract {
  create(data: UserCreateRequest): Promise<PublicUser>;
  findAll(): Promise<PublicUser[]>;
  findById(id: string): Promise<PublicUser | null>;
  search(termo: unknown, actorId: string): Promise<UserSearchResult[]>;
  update(id: string, data: UserUpdateRequest): Promise<PublicUser | null>;
  delete(id: string): Promise<boolean>;
}

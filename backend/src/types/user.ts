import type { Papel, Usuario } from "@prisma/client";

// Usuário como a API o expõe: nunca inclui a senha (nem o hash).
export type PublicUser = Omit<Usuario, "senha">;

// O papel não faz parte do cadastro: todo novo usuário é CLIENTE.
export type UserCreateRequest = {
  nome: string;
  username: string;
  email: string;
  senha: string;
  avatarUrl?: string | null;
};

export type UserUpdateRequest = Partial<UserCreateRequest> & { papel?: Papel };

export interface UserServiceContract {
  create(data: UserCreateRequest): Promise<PublicUser>;
  findAll(): Promise<PublicUser[]>;
  findById(id: string): Promise<PublicUser | null>;
  update(id: string, data: UserUpdateRequest): Promise<PublicUser | null>;
  delete(id: string): Promise<boolean>;
}

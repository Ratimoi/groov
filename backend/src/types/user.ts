export type PapelUsuario = "CLIENTE" | "PRODUTOR" | "ADMIN";

export type User = {
  id: string;
  nome: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  senha: string;
  papel: PapelUsuario;
  criadoEm: Date;
};

export type UserCreateRequest = {
  nome: string;
  username: string;
  email: string;
  senha: string;
  papel?: PapelUsuario;
};

export interface UserServiceContract {
  create(data: UserCreateRequest): Promise<User>;
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  update(id: string, data: Partial<UserCreateRequest>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}
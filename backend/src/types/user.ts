import type { Papel } from "@prisma/client";
import type { UserModel } from "../models/UserModel";

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
  create(data: UserCreateRequest): Promise<UserModel>;
  findAll(): Promise<UserModel[]>;
  findById(id: string): Promise<UserModel | null>;
  update(id: string, data: UserUpdateRequest): Promise<UserModel | null>;
  delete(id: string): Promise<boolean>;
}

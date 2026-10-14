import type { Usuario } from "@prisma/client";
import { UserModel } from "../models/UserModel";
import type { UserCreateRequest, UserServiceContract, UserUpdateRequest } from "../types/user";

export class UserService implements UserServiceContract {
  private userModel: UserModel;

  constructor(userModel: UserModel = new UserModel()) {
    this.userModel = userModel;
  }

  async create(data: UserCreateRequest): Promise<Usuario> {
    return this.userModel.create(data);
  }

  async findAll(): Promise<Usuario[]> {
    return this.userModel.findAll();
  }

  async findById(id: string): Promise<Usuario | null> {
    return this.userModel.findById(id);
  }

  async update(id: string, data: UserUpdateRequest): Promise<Usuario | null> {
    return this.userModel.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.userModel.delete(id);
  }
}

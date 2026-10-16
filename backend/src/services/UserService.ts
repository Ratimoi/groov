import { UserModel } from "../models/UserModel";
import type {
  PublicUser,
  UserCreateRequest,
  UserServiceContract,
  UserUpdateRequest,
} from "../types/user";
import { AppError } from "../utils/AppError";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../utils/password";

export class UserService implements UserServiceContract {
  private userModel: UserModel;

  constructor(userModel: UserModel = new UserModel()) {
    this.userModel = userModel;
  }

  async create(data: UserCreateRequest): Promise<PublicUser> {
    const senha = await this.hashValidPassword(data.senha);
    return this.userModel.create({ ...data, senha });
  }

  async findAll(): Promise<PublicUser[]> {
    return this.userModel.findAll();
  }

  async findById(id: string): Promise<PublicUser | null> {
    return this.userModel.findById(id);
  }

  async update(id: string, data: UserUpdateRequest): Promise<PublicUser | null> {
    if (data.senha === undefined) {
      return this.userModel.update(id, data);
    }
    const senha = await this.hashValidPassword(data.senha);
    return this.userModel.update(id, { ...data, senha });
  }

  async delete(id: string): Promise<boolean> {
    return this.userModel.delete(id);
  }

  private async hashValidPassword(senha: unknown): Promise<string> {
    if (typeof senha !== "string" || senha.length < MIN_PASSWORD_LENGTH) {
      throw new AppError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`, 400);
    }
    return hashPassword(senha);
  }
}

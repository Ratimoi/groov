import { Papel } from "@prisma/client";
import { UserModel } from "../models/UserModel";
import type {
  PublicUser,
  UserCreateRequest,
  UserServiceContract,
  UserUpdateRequest,
} from "../types/user";
import { AppError } from "../utils/AppError";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../utils/password";

// Só estes campos entram no banco; o resto do corpo (id, criadoEm, papel no cadastro...) é ignorado.
function pick<T extends object, K extends keyof T>(data: T, keys: readonly K[]): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (data[key] !== undefined) result[key] = data[key];
  }
  return result;
}

const PROFILE_FIELDS = ["nome", "username", "email", "avatarUrl"] as const;

export class UserService implements UserServiceContract {
  private userModel: UserModel;

  constructor(userModel: UserModel = new UserModel()) {
    this.userModel = userModel;
  }

  async create(data: UserCreateRequest): Promise<PublicUser> {
    const senha = await this.hashValidPassword(data.senha);
    return this.userModel.create({ ...pick(data, PROFILE_FIELDS), senha } as UserCreateRequest);
  }

  async findAll(): Promise<PublicUser[]> {
    return this.userModel.findAll();
  }

  async findById(id: string): Promise<PublicUser | null> {
    return this.userModel.findById(id);
  }

  async update(id: string, data: UserUpdateRequest): Promise<PublicUser | null> {
    const changes: UserUpdateRequest = pick(data, [...PROFILE_FIELDS, "papel"] as const);

    if (changes.papel !== undefined && !Object.values(Papel).includes(changes.papel)) {
      throw new AppError("papel inválido", 400);
    }
    if (data.senha !== undefined) {
      changes.senha = await this.hashValidPassword(data.senha);
    }
    return this.userModel.update(id, changes);
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

import { Papel } from "@prisma/client";
import { UserModel } from "../models/UserModel";
import type {
  PublicUser,
  UserCreateRequest,
  UserSearchResult,
  UserServiceContract,
  UserUpdateRequest,
} from "../types/user";
import { AppError } from "../utils/AppError";
import { normalizeCpf } from "../utils/cpf";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../utils/password";

// Só estes campos entram no banco; o resto do corpo (id, criadoEm, papel no cadastro...) é ignorado.
function pick<T extends object, K extends keyof T>(data: T, keys: readonly K[]): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (data[key] !== undefined) result[key] = data[key];
  }
  return result;
}

const MIN_SEARCH_LENGTH = 2;
const SEARCH_LIMIT = 20;

const PROFILE_FIELDS = ["nome", "username", "email", "avatarUrl", "cpf"] as const;

export class UserService implements UserServiceContract {
  private userModel: UserModel;

  constructor(userModel: UserModel = new UserModel()) {
    this.userModel = userModel;
  }

  async create(data: UserCreateRequest): Promise<PublicUser> {
    const cpf = normalizeCpf(data.cpf);
    if (data.cpf === undefined || data.cpf === null || data.cpf === "") throw new AppError("cpf é obrigatório", 400);
    if (!cpf) throw new AppError("cpf inválido", 400);

    const senha = await this.hashValidPassword(data.senha);
    return this.userModel.create({ ...pick(data, PROFILE_FIELDS), cpf, senha } as UserCreateRequest);
  }

  async findAll(): Promise<PublicUser[]> {
    return this.userModel.findAll();
  }

  async findById(id: string): Promise<PublicUser | null> {
    return this.userModel.findById(id);
  }

  // Busca para convidar pessoas a um grupo: devolve poucos resultados e só dados públicos.
  async search(termo: unknown, actorId: string): Promise<UserSearchResult[]> {
    const texto = typeof termo === "string" ? termo.trim() : "";
    if (texto.length < MIN_SEARCH_LENGTH) {
      throw new AppError(`q deve ter pelo menos ${MIN_SEARCH_LENGTH} caracteres`, 400);
    }
    return this.userModel.search(texto, actorId, SEARCH_LIMIT);
  }

  async update(id: string, data: UserUpdateRequest): Promise<PublicUser | null> {
    const changes: UserUpdateRequest = pick(data, [...PROFILE_FIELDS, "papel"] as const);

    if (changes.papel !== undefined && !Object.values(Papel).includes(changes.papel)) {
      throw new AppError("papel inválido", 400);
    }
    if (data.cpf !== undefined) {
      const cpf = normalizeCpf(data.cpf);
      if (!cpf) throw new AppError("cpf inválido", 400);
      changes.cpf = cpf;
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

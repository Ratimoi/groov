import { randomBytes } from "node:crypto";
import { UserModel } from "../models/UserModel";
import type { AuthServiceContract, LoginRequest, LoginResponse } from "../types/auth";
import type { PublicUser } from "../types/user";
import { AppError } from "../utils/AppError";
import { hashPassword, verifyPassword } from "../utils/password";
import { signToken } from "../utils/token";

// Hash descartável, usado quando o e-mail não existe, para o tempo de resposta não revelar
// se a conta existe (a verificação de senha roda de qualquer jeito).
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

export class AuthService implements AuthServiceContract {
  private userModel: UserModel;

  constructor(userModel: UserModel = new UserModel()) {
    this.userModel = userModel;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    if (typeof data?.email !== "string" || typeof data?.senha !== "string") {
      throw new AppError("email e senha são obrigatórios", 400);
    }

    const user = await this.userModel.findByEmailWithPassword(data.email);
    const passwordOk = await verifyPassword(data.senha, user?.senha ?? (await getDummyHash()));
    if (!user || !passwordOk) {
      throw new AppError("Credenciais inválidas", 401);
    }

    const { senha: _senha, cpf: _cpf, ...usuario } = user;
    return { token: signToken(user.id), usuario };
  }

  async me(userId: string): Promise<PublicUser | null> {
    return this.userModel.findById(userId);
  }
}

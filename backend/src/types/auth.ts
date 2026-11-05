import type { Papel } from "@prisma/client";
import type { PublicUser } from "./user";

export type AuthUser = { id: string; papel: Papel };

export type LoginRequest = { email: string; senha: string };

// `temCpf` avisa o app de contas anteriores à exigência do CPF; o número em si nunca sai da API.
// `podeValidar`: gerente de algum evento ou VALIDADOR em algum (mostra "Validar ingressos" no app).
export type SessionUser = PublicUser & { temCpf: boolean; podeValidar: boolean };

export type LoginResponse = { token: string; usuario: SessionUser };

export interface AuthServiceContract {
  login(data: LoginRequest): Promise<LoginResponse>;
  me(userId: string): Promise<SessionUser | null>;
}

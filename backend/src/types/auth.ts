import type { Papel } from "@prisma/client";
import type { PublicUser } from "./user";

export type AuthUser = { id: string; papel: Papel };

export type LoginRequest = { email: string; senha: string };

export type LoginResponse = { token: string; usuario: PublicUser };

export interface AuthServiceContract {
  login(data: LoginRequest): Promise<LoginResponse>;
  me(userId: string): Promise<PublicUser | null>;
}

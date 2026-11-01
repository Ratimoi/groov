import { PrismaClient, type Usuario } from "@prisma/client";
import prisma from "../config/prisma";
import { isNotFoundError } from "../utils/prismaErrors";
import type { PublicUser, UserCreateRequest, UserSearchResult, UserUpdateRequest } from "../types/user";

// A senha e o CPF nunca são lidos do banco para as respostas da API.
const omitPassword = { senha: true, cpf: true } as const;

export class UserModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async create(data: UserCreateRequest): Promise<PublicUser> {
    return this.prismaClient.usuario.create({
      data,
      omit: omitPassword,
    });
  }

  async findAll(): Promise<PublicUser[]> {
    return this.prismaClient.usuario.findMany({ omit: omitPassword });
  }

  async findById(id: string): Promise<PublicUser | null> {
    return this.prismaClient.usuario.findUnique({
      where: { id },
      omit: omitPassword,
    });
  }

  // Só para o próprio usuário (/auth/me): traz o CPF para o service reduzir a um "tem ou não tem".
  async findSelf(id: string): Promise<(PublicUser & { cpf: string | null }) | null> {
    return this.prismaClient.usuario.findUnique({ where: { id }, omit: { senha: true } });
  }

  async search(termo: string, excluirId: string, limite: number): Promise<UserSearchResult[]> {
    return this.prismaClient.usuario.findMany({
      where: {
        id: { not: excluirId },
        OR: [
          { nome: { contains: termo, mode: "insensitive" } },
          { username: { contains: termo, mode: "insensitive" } },
        ],
      },
      select: { id: true, nome: true, username: true, avatarUrl: true },
      orderBy: { nome: "asc" },
      take: limite,
    });
  }

  // Único método que lê a senha (hash). Existe só para o login: não repassar o resultado à API.
  async findIdByUsername(username: string): Promise<string | null> {
    const usuario = await this.prismaClient.usuario.findUnique({ where: { username }, select: { id: true } });
    return usuario?.id ?? null;
  }

  async findByEmailWithPassword(email: string): Promise<Usuario | null> {
    return this.prismaClient.usuario.findUnique({
      where: { email },
    });
  }

  async update(id: string, data: UserUpdateRequest): Promise<PublicUser | null> {
    try {
      return await this.prismaClient.usuario.update({
        where: { id },
        data,
        omit: omitPassword,
      });
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prismaClient.usuario.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  }
}

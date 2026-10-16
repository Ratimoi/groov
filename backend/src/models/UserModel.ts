import { PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import { isNotFoundError } from "../utils/prismaErrors";
import type { PublicUser, UserCreateRequest, UserUpdateRequest } from "../types/user";

// A senha nunca é lida do banco para as respostas da API.
const omitPassword = { senha: true } as const;

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

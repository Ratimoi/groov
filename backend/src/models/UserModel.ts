import { PrismaClient, type Usuario } from "@prisma/client";
import prisma from "../config/prisma";
import { isNotFoundError } from "../utils/prismaErrors";
import type { UserCreateRequest, UserUpdateRequest } from "../types/user";

export class UserModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async create(data: UserCreateRequest): Promise<Usuario> {
    return this.prismaClient.usuario.create({
      data,
    });
  }

  async findAll(): Promise<Usuario[]> {
    return this.prismaClient.usuario.findMany();
  }

  async findById(id: string): Promise<Usuario | null> {
    return this.prismaClient.usuario.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: UserUpdateRequest): Promise<Usuario | null> {
    try {
      return await this.prismaClient.usuario.update({
        where: { id },
        data,
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

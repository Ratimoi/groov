import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import { UserModel } from "../models/UserModel";
import type { UserCreateRequest, UserServiceContract, UserUpdateRequest } from "../types/user";

function isNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

export class UserService implements UserServiceContract {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async create(data: UserCreateRequest): Promise<UserModel> {
    const usuario = await this.prismaClient.usuario.create({
      data,
    });
    return UserModel.fromPrisma(usuario);
  }

  async findAll(): Promise<UserModel[]> {
    const usuarios = await this.prismaClient.usuario.findMany();
    return usuarios.map(UserModel.fromPrisma);
  }

  async findById(id: string): Promise<UserModel | null> {
    const usuario = await this.prismaClient.usuario.findUnique({
      where: { id },
    });
    return usuario ? UserModel.fromPrisma(usuario) : null;
  }

  async update(id: string, data: UserUpdateRequest): Promise<UserModel | null> {
    try {
      const usuario = await this.prismaClient.usuario.update({
        where: { id },
        data,
      });
      return UserModel.fromPrisma(usuario);
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

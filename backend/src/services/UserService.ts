import prisma from "../config/prisma";
import type { User, UserCreateRequest, UserServiceContract } from "../types/user";

export class UserService implements UserServiceContract {
  private prismaClient: any;

  constructor() {
    this.prismaClient = prisma;
  }

  async create(data: UserCreateRequest): Promise<User> {
    return await this.prismaClient.usuario.create({
      data,
    });
  }

  async findAll(): Promise<User[]> {
    return await this.prismaClient.usuario.findMany();
  }

  async findById(id: string): Promise<User | null> {
    return await this.prismaClient.usuario.findUnique({
      where: { id },
    });
  }

  async update(id: string, updatedUser: Partial<UserCreateRequest>): Promise<User | null> {
    return await this.prismaClient.usuario.update({
      where: { id },
      data: updatedUser,
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prismaClient.usuario.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}
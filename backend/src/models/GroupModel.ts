import { PrismaClient, type Grupo } from "@prisma/client";
import prisma from "../config/prisma";
import { isNotFoundError } from "../utils/prismaErrors";
import type { GroupCreateRequest, GroupUpdateRequest, GrupoCompleto } from "../types/group";
import { grupoInclude } from "../types/group";

export class GroupModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async create(data: GroupCreateRequest): Promise<Grupo> {
    return this.prismaClient.grupo.create({
      data: {
        ...data,
        membros: { create: { usuarioId: data.liderId } },
      },
    });
  }

  async findAll(): Promise<Grupo[]> {
    return this.prismaClient.grupo.findMany();
  }

  async findAllByMember(usuarioId: string): Promise<Grupo[]> {
    return this.prismaClient.grupo.findMany({
      where: { membros: { some: { usuarioId } } },
    });
  }

  async findById(id: string): Promise<Grupo | null> {
    return this.prismaClient.grupo.findUnique({
      where: { id },
    });
  }

  async findByUsuario(usuarioId: string): Promise<GrupoCompleto[]> {
    return this.prismaClient.grupo.findMany({
      where: {
        OR: [
          { liderId: usuarioId },
          { membros: { some: { usuarioId } } },
        ],
      },
      orderBy: { nome: "asc" },
      include: grupoInclude,
    });
  }

  async update(id: string, data: GroupUpdateRequest): Promise<Grupo | null> {
    try {
      return await this.prismaClient.grupo.update({
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
      await this.prismaClient.$transaction([
        this.prismaClient.membroGrupo.deleteMany({ where: { grupoId: id } }),
        this.prismaClient.grupo.delete({ where: { id } }),
      ]);
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  }
}

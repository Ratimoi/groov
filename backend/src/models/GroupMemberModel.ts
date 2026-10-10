import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import { isNotFoundError } from "../utils/prismaErrors";

const groupMemberInclude = {
  usuario: {
    select: { id: true, nome: true, username: true, avatarUrl: true },
  },
} satisfies Prisma.MembroGrupoInclude;

export type GroupMember = Prisma.MembroGrupoGetPayload<{ include: typeof groupMemberInclude }>;

export class GroupMemberModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async findByGroup(grupoId: string): Promise<GroupMember[]> {
    return this.prismaClient.membroGrupo.findMany({
      where: { grupoId },
      include: groupMemberInclude,
      orderBy: { entrouEm: "asc" },
    });
  }

  async create(grupoId: string, usuarioId: string): Promise<GroupMember> {
    return this.prismaClient.membroGrupo.create({
      data: { grupoId, usuarioId },
      include: groupMemberInclude,
    });
  }

  async delete(grupoId: string, usuarioId: string): Promise<boolean> {
    try {
      await this.prismaClient.membroGrupo.delete({
        where: { grupoId_usuarioId: { grupoId, usuarioId } },
      });
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  }
}

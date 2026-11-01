import { PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import { generateInviteCode } from "../utils/inviteCode";

export type GroupInvite = { codigo: string; grupoId: string; grupo: { id: string; nome: string } };

export class GroupInviteModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  // Um grupo tem um único código: pedir de novo devolve o mesmo.
  async findOrCreate(grupoId: string): Promise<string> {
    const convite = await this.prismaClient.conviteGrupo.upsert({
      where: { grupoId },
      create: { grupoId, codigo: generateInviteCode() },
      update: {},
    });
    return convite.codigo;
  }

  async findByCode(codigo: string): Promise<GroupInvite | null> {
    return this.prismaClient.conviteGrupo.findUnique({
      where: { codigo },
      include: { grupo: { select: { id: true, nome: true } } },
    });
  }
}

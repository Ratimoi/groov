import { PrismaClient, type FuncaoEvento } from "@prisma/client";
import prisma from "../config/prisma";

export type MembroEquipe = {
  usuarioId: string;
  funcao: FuncaoEvento;
  usuario: { id: string; nome: string; username: string; avatarUrl: string | null };
};

export type EventoDaEquipe = {
  funcao: FuncaoEvento;
  evento: { id: string; titulo: string; imagemUrl: string | null; comecaEm: Date; terminaEm: Date | null; cidade: string };
};

export class EventTeamModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async findFuncao(eventoId: string, usuarioId: string): Promise<FuncaoEvento | null> {
    const membro = await this.prismaClient.membroEvento.findUnique({
      where: { eventoId_usuarioId: { eventoId, usuarioId } },
      select: { funcao: true },
    });
    return membro?.funcao ?? null;
  }

  async findByEvent(eventoId: string): Promise<MembroEquipe[]> {
    return this.prismaClient.membroEvento.findMany({
      where: { eventoId },
      select: {
        usuarioId: true,
        funcao: true,
        usuario: { select: { id: true, nome: true, username: true, avatarUrl: true } },
      },
      orderBy: [{ funcao: "asc" }, { criadoEm: "asc" }],
    });
  }

  async findEventsByUser(usuarioId: string): Promise<EventoDaEquipe[]> {
    return this.prismaClient.membroEvento.findMany({
      where: { usuarioId },
      select: {
        funcao: true,
        evento: { select: { id: true, titulo: true, imagemUrl: true, comecaEm: true, terminaEm: true, cidade: true } },
      },
      orderBy: { evento: { comecaEm: "asc" } },
    });
  }

  async upsert(eventoId: string, usuarioId: string, funcao: FuncaoEvento): Promise<void> {
    await this.prismaClient.membroEvento.upsert({
      where: { eventoId_usuarioId: { eventoId, usuarioId } },
      create: { eventoId, usuarioId, funcao },
      update: { funcao },
    });
  }

  async remove(eventoId: string, usuarioId: string): Promise<boolean> {
    const { count } = await this.prismaClient.membroEvento.deleteMany({ where: { eventoId, usuarioId } });
    return count > 0;
  }
}

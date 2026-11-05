import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";

const HORAS_12 = 12 * 60 * 60 * 1000;

export type FeedAba = "todos" | "seguindo" | "salvos";
export type FeedCursor = { criadoEm: Date; id: string };

const feedInclude = {
  criadoPor: { select: { id: true, nome: true, username: true, avatarUrl: true } },
  atracoes: { orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }], take: 4, select: { id: true, nome: true } },
  lotes: { select: { preco: true, quantidade: true, quantidadeVendida: true, quantidadeReservada: true } },
  _count: { select: { curtidas: true } },
} satisfies Prisma.EventoInclude;

export class FeedModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  // Eventos mais recentes primeiro (criadoEm, depois id). Fora da aba "salvos", só o que ainda não
  // acabou (começou há menos de 12h ou começa no futuro). `take: limit + 1` revela se há próxima página.
  async findPage(opts: { usuarioId: string; aba: FeedAba; cursor: FeedCursor | null; limit: number; agora: Date }) {
    const { usuarioId, aba, cursor, limit, agora } = opts;
    const where: Prisma.EventoWhereInput = { ocultoEm: null };
    if (aba !== "salvos") where.comecaEm = { gte: new Date(agora.getTime() - HORAS_12) };
    if (aba === "seguindo") where.criadoPor = { seguidores: { some: { seguidorId: usuarioId } } };
    if (aba === "salvos") where.salvos = { some: { usuarioId } };
    if (cursor) {
      where.AND = [
        { OR: [{ criadoEm: { lt: cursor.criadoEm } }, { criadoEm: cursor.criadoEm, id: { lt: cursor.id } }] },
      ];
    }
    return this.prismaClient.evento.findMany({
      where,
      orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: feedInclude,
    });
  }

  // O que o usuário já fez com esses eventos/organizadores, para marcar o coração, o marcador e o "seguindo".
  async viewerState(usuarioId: string, eventoIds: string[], organizadorIds: string[]) {
    const [curtidas, salvos, seguidos] = await Promise.all([
      this.prismaClient.curtidaEvento.findMany({ where: { usuarioId, eventoId: { in: eventoIds } }, select: { eventoId: true } }),
      this.prismaClient.eventoSalvo.findMany({ where: { usuarioId, eventoId: { in: eventoIds } }, select: { eventoId: true } }),
      this.prismaClient.seguidor.findMany({ where: { seguidorId: usuarioId, seguidoId: { in: organizadorIds } }, select: { seguidoId: true } }),
    ]);
    return {
      curtidos: new Set(curtidas.map((c) => c.eventoId)),
      salvos: new Set(salvos.map((s) => s.eventoId)),
      seguidos: new Set(seguidos.map((s) => s.seguidoId)),
    };
  }

  async eventExists(eventoId: string): Promise<boolean> {
    const evento = await this.prismaClient.evento.findUnique({ where: { id: eventoId }, select: { id: true, ocultoEm: true } });
    return !!evento && !evento.ocultoEm;
  }

  async userExists(usuarioId: string): Promise<boolean> {
    return !!(await this.prismaClient.usuario.findUnique({ where: { id: usuarioId }, select: { id: true } }));
  }

  async like(eventoId: string, usuarioId: string): Promise<void> {
    await this.prismaClient.curtidaEvento.createMany({ data: [{ eventoId, usuarioId }], skipDuplicates: true });
  }

  async unlike(eventoId: string, usuarioId: string): Promise<void> {
    await this.prismaClient.curtidaEvento.deleteMany({ where: { eventoId, usuarioId } });
  }

  countLikes(eventoId: string): Promise<number> {
    return this.prismaClient.curtidaEvento.count({ where: { eventoId } });
  }

  async save(eventoId: string, usuarioId: string): Promise<void> {
    await this.prismaClient.eventoSalvo.createMany({ data: [{ eventoId, usuarioId }], skipDuplicates: true });
  }

  async unsave(eventoId: string, usuarioId: string): Promise<void> {
    await this.prismaClient.eventoSalvo.deleteMany({ where: { eventoId, usuarioId } });
  }

  async follow(seguidorId: string, seguidoId: string): Promise<void> {
    await this.prismaClient.seguidor.createMany({ data: [{ seguidorId, seguidoId }], skipDuplicates: true });
  }

  async unfollow(seguidorId: string, seguidoId: string): Promise<void> {
    await this.prismaClient.seguidor.deleteMany({ where: { seguidorId, seguidoId } });
  }
}

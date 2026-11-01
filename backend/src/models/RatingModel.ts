import { PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import type { Rating, RatingEvent, RatingStats, RatingSummary } from "../types/rating";

// Média com uma casa decimal; sem avaliações não há média (null), não zero.
const stats = (aggregate: { _avg: { nota: number | null }; _count: number }): RatingStats => ({
  media: aggregate._avg.nota === null ? null : Math.round(aggregate._avg.nota * 10) / 10,
  total: aggregate._count,
});

export class RatingModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async findEvent(eventoId: string): Promise<RatingEvent | null> {
    return this.prismaClient.evento.findUnique({
      where: { id: eventoId },
      select: {
        id: true,
        criadoPorId: true,
        criadoPor: { select: { id: true, nome: true, username: true, avatarUrl: true } },
      },
    });
  }

  async hasAttended(eventoId: string, usuarioId: string): Promise<boolean> {
    return (await this.prismaClient.ingresso.count({ where: { eventoId, donoId: usuarioId, status: "USADO" } })) > 0;
  }

  // Uma nota por pessoa e evento: avaliar de novo substitui a anterior.
  async upsert(eventoId: string, usuarioId: string, nota: number, comentario: string | null): Promise<Rating> {
    return this.prismaClient.avaliacaoEvento.upsert({
      where: { eventoId_usuarioId: { eventoId, usuarioId } },
      create: { eventoId, usuarioId, nota, comentario },
      update: { nota, comentario },
    });
  }

  async summary(evento: RatingEvent): Promise<RatingSummary> {
    const doEvento = await this.prismaClient.avaliacaoEvento.aggregate({
      where: { eventoId: evento.id },
      _avg: { nota: true },
      _count: true,
    });
    if (!evento.criadoPor) return { evento: stats(doEvento), organizador: null };

    const doOrganizador = await this.prismaClient.avaliacaoEvento.aggregate({
      where: { evento: { criadoPorId: evento.criadoPor.id } },
      _avg: { nota: true },
      _count: true,
    });
    return { evento: stats(doEvento), organizador: { ...evento.criadoPor, ...stats(doOrganizador) } };
  }
}

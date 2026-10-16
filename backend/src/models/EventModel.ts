import { Evento, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import type { PaginationParams } from "../utils/pagination";

export class EventModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async findById(id: string): Promise<Evento | null> {
    return this.prismaClient.evento.findUnique({
      where: { id },
    });
  }

  async findPage({ page, limit }: PaginationParams): Promise<{ events: Evento[]; total: number }> {
    const [events, total] = await Promise.all([
      this.prismaClient.evento.findMany({
        // O id desempata eventos que começam juntos; sem ele as páginas podem repetir ou perder itens.
        orderBy: [{ comecaEm: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaClient.evento.count(),
    ]);
    return { events, total };
  }
}

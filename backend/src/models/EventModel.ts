import { Evento, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import type { EventCreateData, EventUpdateData } from "../utils/eventInput";
import type { LotCreateData } from "../utils/lotInput";
import type { PaginationParams } from "../utils/pagination";
import { AppError } from "../utils/AppError";
import { isNotFoundError } from "../utils/prismaErrors";
import { eventoInclude, EventoCompleto } from "../types/event";

export type AtracaoRow = { nome: string; fotoUrl: string | null; usuarioId: string | null };

export class EventModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async findById(id: string): Promise<Evento | null> {
    return this.prismaClient.evento.findUnique({
      where: { id },
      include: eventoInclude,
    });
  }

  // Atração já resolvida: `usuarioId` é a conta marcada (se houver).
  async create(
    data: EventCreateData,
    criadoPorId: string,
    extras: { atracoes?: AtracaoRow[]; lotes?: LotCreateData[] } = {},
  ): Promise<Evento> {
    const { atracoes, lotes } = extras;
    return this.prismaClient.evento.create({
      data: {
        ...data,
        criadoPorId,
        ...(atracoes?.length ? { atracoes: { create: atracoes.map((a, ordem) => ({ ...a, ordem })) } } : {}),
        ...(lotes?.length ? { lotes: { create: lotes } } : {}),
      },
    });
  }

  // `atracoes` definido troca a lista inteira, na mesma operação.
  async update(id: string, data: EventUpdateData, atracoes?: AtracaoRow[]): Promise<Evento | null> {
    try {
      return await this.prismaClient.evento.update({
        where: { id },
        data: {
          ...data,
          ...(atracoes ? { atracoes: { deleteMany: {}, create: atracoes.map((a, ordem) => ({ ...a, ordem })) } } : {}),
        },
      });
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  }

  // Evento com pedidos (pagos ou não) não é apagado: tem ingressos e dinheiro envolvidos.
  // Sem pedidos, leva junto os lotes e as avaliações, na mesma transação.
  async delete(id: string): Promise<boolean> {
    try {
      await this.prismaClient.$transaction(async (tx) => {
        if ((await tx.pedido.count({ where: { eventoId: id } })) > 0) {
          throw new AppError("Evento com ingressos vendidos ou reservados não pode ser apagado", 409);
        }
        await tx.avaliacaoEvento.deleteMany({ where: { eventoId: id } });
        await tx.lote.deleteMany({ where: { eventoId: id } });
        await tx.evento.delete({ where: { id } });
      });
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  }

  async findPage({ page, limit }: PaginationParams): Promise<{ events: EventoCompleto[]; total: number }> {
    const [events, total] = await Promise.all([
      this.prismaClient.evento.findMany({
        where: { ocultoEm: null },
        // O id desempata eventos que começam juntos; sem ele as páginas podem repetir ou perder itens.
        orderBy: [{ comecaEm: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: eventoInclude,
      }),
      this.prismaClient.evento.count({ where: { ocultoEm: null } }),
    ]);
    return { events, total };
  }
}

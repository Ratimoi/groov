import { Evento, Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import type { EventCreateData, EventUpdateData } from "../utils/eventInput";
import type { LotCreateData } from "../utils/lotInput";
import { boundingBox, haversineKm, type EventFilters } from "../utils/eventFilters";
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

  private whereOf(filters: EventFilters): Prisma.EventoWhereInput {
    const where: Prisma.EventoWhereInput = { ocultoEm: null };
    const and: Prisma.EventoWhereInput[] = [];
    if (filters.q) {
      const contem = { contains: filters.q, mode: "insensitive" as const };
      and.push({
        OR: [{ titulo: contem }, { descricao: contem }, { nomeLocal: contem }, { cidade: contem }, { tags: { has: filters.q.toLowerCase() } }],
      });
    }
    if (filters.categoria) where.categoria = { nome: { equals: filters.categoria, mode: "insensitive" } };
    if (filters.cidade) where.cidade = { equals: filters.cidade, mode: "insensitive" };
    if (filters.tag) where.tags = { has: filters.tag.toLowerCase() };
    if (filters.de || filters.ate) where.comecaEm = { ...(filters.de && { gte: filters.de }), ...(filters.ate && { lte: filters.ate }) };
    if (filters.gratis) and.push({ lotes: { some: { preco: 0 } } });
    else if (filters.precoMax !== undefined) and.push({ lotes: { some: { preco: { lte: filters.precoMax } } } });
    if (filters.near) {
      const box = boundingBox(filters.near);
      where.latitude = { gte: box.latMin, lte: box.latMax };
      where.longitude = { gte: box.lonMin, lte: box.lonMax };
    }
    if (and.length) where.AND = and;
    return where;
  }

  // Sem `near`, a ordem é por início. Com `near`, o banco filtra pela caixa do raio e o Haversine
  // refina e ordena do mais perto para o mais longe (cada evento ganha `distanciaKm`).
  async findPage(
    { page, limit }: PaginationParams,
    filters: EventFilters = {},
  ): Promise<{ events: (EventoCompleto & { distanciaKm?: number })[]; total: number }> {
    const where = this.whereOf(filters);
    const { near } = filters;
    if (near) {
      const candidatos = await this.prismaClient.evento.findMany({ where, take: 500, include: eventoInclude });
      const perto = candidatos
        .map((e) => ({
          ...e,
          distanciaKm: Math.round(haversineKm(near.latitude, near.longitude, e.latitude as number, e.longitude as number) * 10) / 10,
        }))
        .filter((e) => e.distanciaKm <= near.raioKm)
        .sort((a, b) => a.distanciaKm - b.distanciaKm || a.comecaEm.getTime() - b.comecaEm.getTime());
      return { events: perto.slice((page - 1) * limit, page * limit), total: perto.length };
    }
    const [events, total] = await Promise.all([
      this.prismaClient.evento.findMany({
        where,
        // O id desempata eventos que começam juntos; sem ele as páginas podem repetir ou perder itens.
        orderBy: [{ comecaEm: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: eventoInclude,
      }),
      this.prismaClient.evento.count({ where }),
    ]);
    return { events, total };
  }
}

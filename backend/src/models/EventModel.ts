import { Evento, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import type { EventCreateData, EventUpdateData } from "../utils/eventInput";
import type { PaginationParams } from "../utils/pagination";
import { isNotFoundError } from "../utils/prismaErrors";
import { eventoInclude, EventoCompleto } from "../types/event";


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

  async findAll(): Promise<EventoCompleto[]> {
    return prisma.evento.findMany({ include: eventoInclude });
  }

  async create(data: EventCreateData, criadoPorId: string): Promise<Evento> {
    return this.prismaClient.evento.create({
      data: { ...data, criadoPorId },
    });
  }

  async update(id: string, data: EventUpdateData): Promise<Evento | null> {
    try {
      return await this.prismaClient.evento.update({
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
      await this.prismaClient.evento.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  }

  async findPage({ page, limit }: PaginationParams): Promise<{ events: Evento[]; total: number }> {
    const [events, total] = await Promise.all([
      this.prismaClient.evento.findMany({
        orderBy: [{ comecaEm: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaClient.evento.count(),
    ]);
    return { events, total };
  }
}

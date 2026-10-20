import { Evento, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
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
}

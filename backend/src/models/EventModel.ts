import { Evento, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";

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

    async findAll(): Promise<Evento[]> {
      return this.prismaClient.evento.findMany();
    }
}

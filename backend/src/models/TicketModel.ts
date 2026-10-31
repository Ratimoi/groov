import { PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import { ticketInclude, type Ticket } from "../types/ticket";

export class TicketModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async findByOwner(donoId: string): Promise<Ticket[]> {
    return this.prismaClient.ingresso.findMany({
      where: { donoId },
      include: ticketInclude,
      orderBy: { emitidoEm: "desc" },
    });
  }

  async findById(id: string): Promise<Ticket | null> {
    return this.prismaClient.ingresso.findUnique({ where: { id }, include: ticketInclude });
  }
}

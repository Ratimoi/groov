import { PrismaClient, type Lote } from "@prisma/client";
import prisma from "../config/prisma";

export class LotModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async findById(id: string): Promise<Lote | null> {
    return this.prismaClient.lote.findUnique({
      where: { id },
    });
  }
}

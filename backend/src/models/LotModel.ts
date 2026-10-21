import { PrismaClient, type Lote } from "@prisma/client";
import prisma from "../config/prisma";
import type { LotCreateData, LotUpdateData } from "../utils/lotInput";
import { isNotFoundError } from "../utils/prismaErrors";

// Lote com o dono do evento, para checar permissão de edição.
export type LotWithEventOwner = Lote & { evento: { criadoPorId: string | null } };

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

  async findByIdWithEventOwner(id: string): Promise<LotWithEventOwner | null> {
    return this.prismaClient.lote.findUnique({
      where: { id },
      include: { evento: { select: { criadoPorId: true } } },
    });
  }

  async findByEvent(eventoId: string): Promise<Lote[]> {
    return this.prismaClient.lote.findMany({
      where: { eventoId },
      orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
    });
  }

  async create(eventoId: string, data: LotCreateData): Promise<Lote> {
    return this.prismaClient.lote.create({
      data: { ...data, eventoId },
    });
  }

  async update(id: string, data: LotUpdateData): Promise<Lote | null> {
    try {
      return await this.prismaClient.lote.update({
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
      await this.prismaClient.lote.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (isNotFoundError(error)) return false;
      throw error;
    }
  }
}

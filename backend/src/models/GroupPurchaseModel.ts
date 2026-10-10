import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";

const groupPurchaseInclude = {
  participantes: {
    include: {
      usuario: {
        select: { id: true, nome: true, username: true, avatarUrl: true },
      },
    },
  },
} satisfies Prisma.CompraGrupoInclude;

export type GroupPurchase = Prisma.CompraGrupoGetPayload<{ include: typeof groupPurchaseInclude }>;

export type GroupPurchaseCreateData = {
  grupoId: string;
  loteId: string;
  iniciadorId: string;
  expiraEm: Date;
  participantesIds: string[];
};

class InsufficientStockError extends Error {}

export class GroupPurchaseModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async findAll(): Promise<GroupPurchase[]> {
    return this.prismaClient.compraGrupo.findMany({
      include: groupPurchaseInclude,
      orderBy: { criadoEm: "desc" },
    });
  }

  async findById(id: string): Promise<GroupPurchase | null> {
    return this.prismaClient.compraGrupo.findUnique({
      where: { id },
      include: groupPurchaseInclude,
    });
  }

  async findPendingParticipantIds(usuarioIds: string[], eventoId: string): Promise<string[]> {
    const participacoes = await this.prismaClient.participanteCompra.findMany({
      where: {
        usuarioId: { in: usuarioIds },
        compraGrupo: { status: "PENDENTE", lote: { eventoId } },
      },
      select: { usuarioId: true },
    });
    return participacoes.map((participacao) => participacao.usuarioId);
  }

  // Reserva os ingressos no lote e cria a compra na mesma transação.
  // Retorna null se o lote não tiver ingressos suficientes.
  async createWithReservation(data: GroupPurchaseCreateData): Promise<GroupPurchase | null> {
    const quantidade = data.participantesIds.length;

    try {
      return await this.prismaClient.$transaction(async (tx) => {
        const lote = await tx.lote.update({
          where: { id: data.loteId },
          data: { quantidadeReservada: { increment: quantidade } },
        });

        if (lote.quantidadeVendida + lote.quantidadeReservada > lote.quantidade) {
          throw new InsufficientStockError();
        }

        return tx.compraGrupo.create({
          data: {
            grupoId: data.grupoId,
            loteId: data.loteId,
            iniciadorId: data.iniciadorId,
            expiraEm: data.expiraEm,
            participantes: {
              create: data.participantesIds.map((usuarioId) => ({ usuarioId })),
            },
          },
          include: groupPurchaseInclude,
        });
      });
    } catch (error) {
      if (error instanceof InsufficientStockError) return null;
      throw error;
    }
  }
}

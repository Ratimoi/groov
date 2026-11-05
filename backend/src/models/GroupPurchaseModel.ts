import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import { fromCents } from "../utils/money";
import { isNotFoundError } from "../utils/prismaErrors";
import { generateTicketCode } from "../utils/ticketCode";

const groupPurchaseInclude = {
  lote: {
    select: {
      id: true,
      nome: true,
      preco: true,
      tamanhoGrupo: true,
      descontoGrupo: true,
      evento: {
        select: {
          id: true,
          titulo: true,
          imagemUrl: true,
          comecaEm: true,
          nomeLocal: true,
          categoria: { select: { nome: true } },
        },
      },
    },
  },
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

export type GroupSharePaymentData = {
  compraId: string;
  usuarioId: string;
  eventoId: string;
  loteId: string;
  subtotalCents: number;
  descontoCents: number;
  taxaServicoCents: number;
};

class InsufficientStockError extends Error {}
class ShareNotPendingError extends Error {}

export class GroupPurchaseModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  // Com `usuarioId`, só as compras em que o usuário participa.
  async findAll(usuarioId?: string): Promise<GroupPurchase[]> {
    return this.prismaClient.compraGrupo.findMany({
      where: usuarioId ? { participantes: { some: { usuarioId } } } : undefined,
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

  // Pagamento simulado da cota de um participante. A reserva vira venda; quando o último
  // participante paga, a compra é confirmada e os ingressos de todos são emitidos.
  // Retorna null se a cota do participante não estiver mais pendente.
  async payShare(data: GroupSharePaymentData): Promise<GroupPurchase | null> {
    try {
      return await this.prismaClient.$transaction(async (tx) => {
        const valorCents = data.subtotalCents - data.descontoCents + data.taxaServicoCents;

        const pedido = await tx.pedido.create({
          data: {
            usuarioId: data.usuarioId,
            eventoId: data.eventoId,
            loteId: data.loteId,
            quantidade: 1,
            status: "PAGO",
            subtotal: fromCents(data.subtotalCents),
            desconto: fromCents(data.descontoCents),
            taxaServico: fromCents(data.taxaServicoCents),
            valor: fromCents(valorCents),
            pagoEm: new Date(),
          },
        });

        try {
          await tx.participanteCompra.update({
            where: {
              compraGrupoId_usuarioId: { compraGrupoId: data.compraId, usuarioId: data.usuarioId },
              status: "PENDENTE",
            },
            data: { status: "PAGO", pedidoId: pedido.id },
          });
        } catch (error) {
          if (isNotFoundError(error)) throw new ShareNotPendingError();
          throw error;
        }

        await tx.lote.update({
          where: { id: data.loteId },
          data: { quantidadeReservada: { decrement: 1 }, quantidadeVendida: { increment: 1 } },
        });

        const faltamPagar = await tx.participanteCompra.count({
          where: { compraGrupoId: data.compraId, status: { not: "PAGO" } },
        });

        if (faltamPagar === 0) {
          await tx.compraGrupo.update({ where: { id: data.compraId }, data: { status: "CONFIRMADA" } });

          const participantes = await tx.participanteCompra.findMany({
            where: { compraGrupoId: data.compraId },
            select: { usuarioId: true, pedidoId: true },
          });
          await tx.ingresso.createMany({
            data: participantes.map((participante) => ({
              codigoQr: generateTicketCode(),
              eventoId: data.eventoId,
              loteId: data.loteId,
              pedidoId: participante.pedidoId as string,
              donoId: participante.usuarioId,
            })),
          });
        }

        return tx.compraGrupo.findUnique({ where: { id: data.compraId }, include: groupPurchaseInclude });
      });
    } catch (error) {
      if (error instanceof ShareNotPendingError) return null;
      throw error;
    }
  }

  // Compra pendente com o prazo vencido: libera as reservas e devolve o que já foi pago
  // (pedido CANCELADO, participante REEMBOLSADO). Retorna false se não havia o que expirar.
  async expire(compraId: string, now: Date): Promise<boolean> {
    return this.prismaClient.$transaction(async (tx) => {
      const marcada = await tx.compraGrupo.updateMany({
        where: { id: compraId, status: "PENDENTE", expiraEm: { lte: now } },
        data: { status: "EXPIRADA" },
      });
      if (marcada.count === 0) return false;

      const compra = await tx.compraGrupo.findUnique({
        where: { id: compraId },
        select: { loteId: true, participantes: { select: { status: true, pedidoId: true } } },
      });
      if (!compra) return false;

      const pagos = compra.participantes.filter((participante) => participante.status === "PAGO");
      const pedidosPagos = pagos.map((participante) => participante.pedidoId).filter((id): id is string => !!id);

      await tx.pedido.updateMany({ where: { id: { in: pedidosPagos } }, data: { status: "CANCELADO" } });
      await tx.participanteCompra.updateMany({
        where: { compraGrupoId: compraId, status: "PAGO" },
        data: { status: "REEMBOLSADO" },
      });
      await tx.lote.update({
        where: { id: compra.loteId },
        data: {
          quantidadeVendida: { decrement: pagos.length },
          quantidadeReservada: { decrement: compra.participantes.length - pagos.length },
        },
      });
      return true;
    });
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

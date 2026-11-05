import { PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import { orderInclude, type Order } from "../types/order";
import { fromCents } from "../utils/money";
import { generateTicketCode } from "../utils/ticketCode";

export type OrderCreateData = {
  usuarioId: string;
  eventoId: string;
  loteId: string;
  quantidade: number;
  subtotalCents: number;
  taxaServicoCents: number;
};

class InsufficientStockError extends Error {}

export class OrderModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  // Pagamento simulado: o pedido já nasce PAGO e emite os ingressos na mesma transação em que
  // vende o estoque. Retorna null se o lote não tiver ingressos suficientes.
  async createPaid(data: OrderCreateData): Promise<Order | null> {
    try {
      return await this.prismaClient.$transaction(async (tx) => {
        const lote = await tx.lote.update({
          where: { id: data.loteId },
          data: { quantidadeVendida: { increment: data.quantidade } },
        });

        if (lote.quantidadeVendida + lote.quantidadeReservada > lote.quantidade) {
          throw new InsufficientStockError();
        }

        return tx.pedido.create({
          data: {
            usuarioId: data.usuarioId,
            eventoId: data.eventoId,
            loteId: data.loteId,
            quantidade: data.quantidade,
            status: "PAGO",
            subtotal: fromCents(data.subtotalCents),
            desconto: "0.00",
            taxaServico: fromCents(data.taxaServicoCents),
            valor: fromCents(data.subtotalCents + data.taxaServicoCents),
            pagoEm: new Date(),
            ingressos: {
              create: Array.from({ length: data.quantidade }, () => ({
                codigoQr: generateTicketCode(),
                eventoId: data.eventoId,
                loteId: data.loteId,
                donoId: data.usuarioId,
              })),
            },
          },
          include: orderInclude,
        });
      });
    } catch (error) {
      if (error instanceof InsufficientStockError) return null;
      throw error;
    }
  }
}

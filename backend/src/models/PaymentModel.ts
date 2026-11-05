import { Prisma, PrismaClient, type Pagamento, type StatusPagamento } from "@prisma/client";
import prisma from "../config/prisma";
import { orderInclude, type Order } from "../types/order";
import type { ChargeResult } from "../services/payments/PaymentProvider";

export type PaymentCreateData = {
  usuarioId: string;
  metodo: "PIX" | "CARTAO";
  provedor: string;
  valor: string;
  itens: Prisma.InputJsonValue;
  expiraEm: Date;
};

export class PaymentModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  create(data: PaymentCreateData): Promise<Pagamento> {
    return this.prismaClient.pagamento.create({ data });
  }

  findById(id: string): Promise<Pagamento | null> {
    return this.prismaClient.pagamento.findUnique({ where: { id } });
  }

  saveCharge(id: string, charge: ChargeResult): Promise<Pagamento> {
    return this.prismaClient.pagamento.update({
      where: { id },
      data: {
        externoId: charge.externoId,
        pixCopiaECola: charge.pixCopiaECola,
        pixQrCodeBase64: charge.pixQrCodeBase64,
        checkoutUrl: charge.checkoutUrl,
      },
    });
  }

  // Só quem ainda não foi decidido muda de estado; devolve false para quem chegou depois (webhook e
  // consulta do app podem aprovar o mesmo pagamento ao mesmo tempo, e só um deve emitir os ingressos).
  async transition(id: string, de: StatusPagamento[], para: StatusPagamento): Promise<boolean> {
    const r = await this.prismaClient.pagamento.updateMany({
      where: { id, status: { in: de } },
      data: { status: para, ...(para === "APROVADO" ? { aprovadoEm: new Date() } : {}) },
    });
    return r.count === 1;
  }

  async saveResult(id: string, resultado: Prisma.InputJsonValue, erroEmissao: string | null): Promise<void> {
    await this.prismaClient.pagamento.update({ where: { id }, data: { resultado, erroEmissao } });
  }

  findOrders(ids: string[]): Promise<Order[]> {
    return this.prismaClient.pedido.findMany({ where: { id: { in: ids } }, include: orderInclude });
  }

  async userEmail(usuarioId: string): Promise<string | null> {
    const u = await this.prismaClient.usuario.findUnique({ where: { id: usuarioId }, select: { email: true } });
    return u?.email ?? null;
  }
}

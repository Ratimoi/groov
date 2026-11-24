import { PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";

export type DashboardRaw = {
  ingressosPorStatus: { status: "VALIDO" | "USADO" | "CANCELADO"; total: number }[];
  tentativas: { resultado: "VALIDO" | "JA_UTILIZADO" | "INVALIDO"; total: number }[];
  lotes: {
    id: string;
    nome: string;
    preco: unknown;
    quantidade: number;
    quantidadeVendida: number;
    quantidadeReservada: number;
  }[];
  receita: unknown;
  entradasPorHora: { hora: Date; total: number }[];
  ultimasEntradas: { ingressoId: string; dono: string; lote: string; usadoEm: Date }[];
};

export class EventDashboardModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async collect(eventoId: string): Promise<DashboardRaw> {
    const [porStatus, tentativas, lotes, receita, porHora, ultimas] = await Promise.all([
      this.prismaClient.ingresso.groupBy({ by: ["status"], where: { eventoId }, _count: { _all: true } }),
      this.prismaClient.validacaoIngresso.groupBy({ by: ["resultado"], where: { eventoId }, _count: { _all: true } }),
      this.prismaClient.lote.findMany({
        where: { eventoId },
        select: { id: true, nome: true, preco: true, quantidade: true, quantidadeVendida: true, quantidadeReservada: true },
        orderBy: { criadoEm: "asc" },
      }),
      this.prismaClient.pedido.aggregate({ where: { eventoId, status: "PAGO" }, _sum: { valor: true } }),
      this.prismaClient.$queryRaw<{ hora: Date; total: bigint }[]>`
        SELECT date_trunc('hour', "usadoEm") AS hora, COUNT(*) AS total
        FROM "Ingresso"
        WHERE "eventoId" = ${eventoId} AND "usadoEm" IS NOT NULL
        GROUP BY 1 ORDER BY 1`,
      this.prismaClient.ingresso.findMany({
        where: { eventoId, status: "USADO", usadoEm: { not: null } },
        select: { id: true, usadoEm: true, dono: { select: { nome: true } }, lote: { select: { nome: true } } },
        orderBy: { usadoEm: "desc" },
        take: 10,
      }),
    ]);

    return {
      ingressosPorStatus: porStatus.map((linha) => ({ status: linha.status, total: linha._count._all })),
      tentativas: tentativas.map((linha) => ({ resultado: linha.resultado, total: linha._count._all })),
      lotes,
      receita: receita._sum.valor,
      entradasPorHora: porHora.map((linha) => ({ hora: linha.hora, total: Number(linha.total) })),
      ultimasEntradas: ultimas.map((ingresso) => ({
        ingressoId: ingresso.id,
        dono: ingresso.dono.nome,
        lote: ingresso.lote.nome,
        usadoEm: ingresso.usadoEm as Date,
      })),
    };
  }
}

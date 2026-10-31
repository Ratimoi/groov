import { PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import { generateTicketCode } from "../utils/ticketCode";
import { ticketInclude, type Ticket, type ValidationReason, type ValidationResult } from "../types/ticket";

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

  // Dá baixa no ingresso e registra a tentativa na mesma transação. A troca VALIDO -> USADO é
  // condicional (updateMany), então duas leituras simultâneas do mesmo código nunca passam as duas.
  async validate(
    codigo: string,
    eventoId: string | undefined,
    validadoPorId: string,
    now: Date,
  ): Promise<{ resultado: ValidationResult; motivo: ValidationReason; ingresso: Ticket | null }> {
    return this.prismaClient.$transaction(async (tx) => {
      const ingresso = await tx.ingresso.findUnique({ where: { codigoQr: codigo }, include: ticketInclude });
      if (!ingresso) return { resultado: "INVALIDO", motivo: "NAO_ENCONTRADO", ingresso: null };

      const registrar = (resultado: ValidationResult) =>
        tx.validacaoIngresso.create({
          data: { codigoLido: codigo, ingressoId: ingresso.id, eventoId: ingresso.eventoId, validadoPorId, resultado },
        });

      if (eventoId && ingresso.eventoId !== eventoId) {
        await registrar("INVALIDO");
        return { resultado: "INVALIDO", motivo: "OUTRO_EVENTO", ingresso };
      }
      if (ingresso.status === "CANCELADO") {
        await registrar("INVALIDO");
        return { resultado: "INVALIDO", motivo: "CANCELADO", ingresso };
      }

      const baixa = await tx.ingresso.updateMany({ where: { id: ingresso.id, status: "VALIDO" }, data: { status: "USADO", usadoEm: now } });
      if (baixa.count === 0) {
        await registrar("JA_UTILIZADO");
        const atual = await tx.ingresso.findUnique({ where: { id: ingresso.id }, include: ticketInclude });
        return { resultado: "JA_UTILIZADO", motivo: "USADO", ingresso: atual ?? ingresso };
      }

      await registrar("VALIDO");
      return { resultado: "VALIDO", motivo: "OK", ingresso: { ...ingresso, status: "USADO", usadoEm: now } };
    });
  }

  // Troca o dono e o código em uma só escrita condicional: o QR antigo (que o dono anterior ainda
  // tem) deixa de valer. Retorna null se o ingresso não é mais do remetente ou já não é VALIDO.
  async transfer(id: string, deDonoId: string, paraDonoId: string): Promise<Ticket | null> {
    return this.prismaClient.$transaction(async (tx) => {
      const troca = await tx.ingresso.updateMany({
        where: { id, donoId: deDonoId, status: "VALIDO" },
        data: { donoId: paraDonoId, codigoQr: generateTicketCode() },
      });
      if (troca.count === 0) return null;
      return tx.ingresso.findUnique({ where: { id }, include: ticketInclude });
    });
  }

  async findById(id: string): Promise<Ticket | null> {
    return this.prismaClient.ingresso.findUnique({ where: { id }, include: ticketInclude });
  }
}

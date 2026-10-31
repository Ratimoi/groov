import type { Prisma } from "@prisma/client";
import type { AuthUser } from "./auth";

export const ticketInclude = {
  evento: {
    select: { id: true, titulo: true, imagemUrl: true, comecaEm: true, terminaEm: true, nomeLocal: true, cidade: true },
  },
  lote: { select: { id: true, nome: true } },
  dono: { select: { id: true, nome: true, username: true } },
} satisfies Prisma.IngressoInclude;

export type Ticket = Prisma.IngressoGetPayload<{ include: typeof ticketInclude }>;

export type ValidationResult = "VALIDO" | "JA_UTILIZADO" | "INVALIDO";
export type ValidationReason = "OK" | "NAO_ENCONTRADO" | "OUTRO_EVENTO" | "CANCELADO" | "USADO";

export type TicketValidation = {
  resultado: ValidationResult;
  mensagem: string;
  ingresso: Ticket | null;
};

export type TicketValidateBody = { codigo?: unknown; eventoId?: unknown };

export interface TicketServiceContract {
  validate(body: TicketValidateBody, actor: AuthUser): Promise<TicketValidation>;
  findAll(actor: AuthUser): Promise<Ticket[]>;
  findById(id: string, actor: AuthUser): Promise<Ticket | null>;
}

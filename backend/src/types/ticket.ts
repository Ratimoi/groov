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

export interface TicketServiceContract {
  findAll(actor: AuthUser): Promise<Ticket[]>;
  findById(id: string, actor: AuthUser): Promise<Ticket | null>;
}

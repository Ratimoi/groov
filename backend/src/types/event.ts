import { Evento, Prisma } from "@prisma/client";
import type { AuthUser } from "./auth";
import type { Paginated, PaginationQuery } from "../utils/pagination";

// Relações que o GET /eventos devolve junto de cada evento.
// Em atracoes só vão campos públicos (nunca senha ou email).
export const eventoInclude = {
  categoria: true,
  lotes: { orderBy: { preco: "asc" } },
  atracoes: {
    select: { id: true, nome: true, username: true, avatarUrl: true },
  },
} satisfies Prisma.EventoInclude;

export type EventoCompleto = Prisma.EventoGetPayload<{ include: typeof eventoInclude }>;

export interface EventServiceContract {
  findAll(query: PaginationQuery): Promise<Paginated<EventoCompleto>>;
  findById(id: string): Promise<Evento | null>;
  create(body: unknown, actor: AuthUser): Promise<Evento>;
  update(id: string, body: unknown, actor: AuthUser): Promise<Evento | null>;
  delete(id: string, actor: AuthUser): Promise<boolean>;
}

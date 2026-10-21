import { Evento, Prisma } from "@prisma/client";
import type { AuthUser } from "./auth";
import type { Paginated, PaginationQuery } from "../utils/pagination";

// Rotas públicas: relações com Usuario sempre com `select`. Um `true` aqui devolveria a linha inteira
// do usuário (senha com hash, e-mail e papel). O teste em tests/eventoInclude.test.ts protege isso.
const usuarioPublico = { select: { id: true, nome: true, username: true, avatarUrl: true } } as const;

export const eventoInclude = {
  categoria: true,
  lotes: { orderBy: { preco: "asc" } },
  atracoes: usuarioPublico,
  criadoPor: usuarioPublico,
} satisfies Prisma.EventoInclude;

export type EventoCompleto = Prisma.EventoGetPayload<{ include: typeof eventoInclude }>;

export interface EventServiceContract {
  findAll(query: PaginationQuery): Promise<Paginated<EventoCompleto>>;
  findById(id: string): Promise<Evento | null>;
  create(body: unknown, actor: AuthUser): Promise<Evento>;
  update(id: string, body: unknown, actor: AuthUser): Promise<Evento | null>;
  delete(id: string, actor: AuthUser): Promise<boolean>;
}

import type { Prisma } from "@prisma/client";
import type { AuthUser } from "./auth";

export const orderInclude = {
  ingressos: { select: { id: true, codigoQr: true, status: true, emitidoEm: true } },
  evento: {
    select: { id: true, titulo: true, imagemUrl: true, comecaEm: true, terminaEm: true, nomeLocal: true, cidade: true },
  },
  lote: { select: { id: true, nome: true } },
} satisfies Prisma.PedidoInclude;

export type Order = Prisma.PedidoGetPayload<{ include: typeof orderInclude }>;

// O comprador é sempre o usuário logado; o preço vem do lote, nunca do corpo.
export type OrderCreateBody = { loteId: string; quantidade: number };

export const MAX_TICKETS_PER_ORDER = 10;

export interface OrderServiceContract {
  create(body: OrderCreateBody, actor: AuthUser): Promise<Order>;
}

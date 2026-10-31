import { vi } from "vitest";

const delegate = () => ({
  create: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  updateMany: vi.fn(),
  createMany: vi.fn(),
  count: vi.fn(),
});

// Cliente Prisma falso: cada teste programa os retornos que precisa.
export const prismaMock = {
  usuario: delegate(),
  grupo: delegate(),
  membroGrupo: delegate(),
  compraGrupo: delegate(),
  participanteCompra: delegate(),
  lote: delegate(),
  pedido: delegate(),
  ingresso: delegate(),
  validacaoIngresso: delegate(),
  evento: delegate(),
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
};

export function resetPrismaMock(): void {
  for (const value of Object.values(prismaMock)) {
    if (typeof value === "function") {
      value.mockReset();
      continue;
    }
    for (const fn of Object.values(value)) fn.mockReset();
  }
}

// Executa a transação em forma de callback usando o próprio mock como `tx`.
export function runTransactionCallbacks(): void {
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prismaMock));
}

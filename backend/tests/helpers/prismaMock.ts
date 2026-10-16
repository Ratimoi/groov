import { vi } from "vitest";

const delegate = () => ({
  create: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

// Cliente Prisma falso: cada teste programa os retornos que precisa.
export const prismaMock = {
  usuario: delegate(),
  grupo: delegate(),
  membroGrupo: delegate(),
  compraGrupo: delegate(),
  lote: delegate(),
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

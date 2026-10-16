import { AppError } from "./AppError";

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// O Prisma só aceita `skip` como inteiro de 32 bits.
const MAX_SKIP = 2_147_483_647;

export type PaginationQuery = { page?: unknown; limit?: unknown };

export type PaginationParams = { page: number; limit: number };

export type Paginated<T> = PaginationParams & {
  data: T[];
  total: number;
  totalPages: number;
};

function parsePositiveInt(value: unknown, name: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value) || Number(value) < 1) {
    throw new AppError(`${name} deve ser um inteiro maior ou igual a 1`, 400);
  }
  return Number(value);
}

// Lê `page` e `limit` da query string (sempre texto). Valores inválidos viram 400.
export function parsePagination(query: PaginationQuery): PaginationParams {
  const page = parsePositiveInt(query.page, "page", 1);
  const limit = parsePositiveInt(query.limit, "limit", DEFAULT_LIMIT);

  if (limit > MAX_LIMIT) {
    throw new AppError(`limit deve ser no máximo ${MAX_LIMIT}`, 400);
  }
  if ((page - 1) * limit > MAX_SKIP) {
    throw new AppError("page fora do intervalo permitido", 400);
  }
  return { page, limit };
}

export function toPaginated<T>(data: T[], total: number, { page, limit }: PaginationParams): Paginated<T> {
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

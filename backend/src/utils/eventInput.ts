import { AppError } from "./AppError";

export type EventData = {
  titulo: string;
  descricao: string | null;
  imagemUrl: string | null;
  comecaEm: Date;
  terminaEm: Date | null;
  nomeLocal: string | null;
  cidade: string;
  categoriaId: string | null;
};

export type EventCreateData = Partial<EventData> & Pick<EventData, "titulo" | "comecaEm" | "cidade">;
export type EventUpdateData = Partial<EventData>;

const MAX_LENGTH = { titulo: 200, descricao: 5000, nomeLocal: 200, cidade: 100, imagemUrl: 2000, categoriaId: 100 };

function fail(message: string): never {
  throw new AppError(message, 400);
}

function requiredText(value: unknown, name: keyof typeof MAX_LENGTH): string {
  if (typeof value !== "string" || value.trim() === "") fail(`${name} é obrigatório`);
  return limited(value.trim(), name);
}

// Texto opcional: `null` limpa o campo.
function optionalText(value: unknown, name: keyof typeof MAX_LENGTH): string | null {
  if (value === null) return null;
  if (typeof value !== "string") fail(`${name} deve ser um texto`);
  return limited(value.trim(), name);
}

function limited(value: string, name: keyof typeof MAX_LENGTH): string {
  if (value.length > MAX_LENGTH[name]) fail(`${name} deve ter no máximo ${MAX_LENGTH[name]} caracteres`);
  return value;
}

function imageUrl(value: unknown): string | null {
  const url = optionalText(value, "imagemUrl");
  if (url === null) return null;
  try {
    const { protocol } = new URL(url);
    if (protocol === "http:" || protocol === "https:") return url;
  } catch {
    // cai no erro abaixo
  }
  return fail("imagemUrl deve ser uma URL http ou https válida");
}

// Só aceita data ISO 8601 (AAAA-MM-DD...), para não depender dos formatos permissivos do Date.
function isoDate(value: unknown, name: string): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    fail(`${name} deve ser uma data ISO 8601 (ex.: 2026-12-31T22:00:00Z)`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail(`${name} deve ser uma data válida`);
  return date;
}

function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) fail("O corpo deve ser um objeto JSON");
  return body as Record<string, unknown>;
}

// Converte e valida os campos presentes. Campos desconhecidos (id, criadoPorId, criadoEm...) são ignorados.
function parseFields(body: Record<string, unknown>): EventUpdateData {
  const data: EventUpdateData = {};
  if (body.titulo !== undefined) data.titulo = requiredText(body.titulo, "titulo");
  if (body.cidade !== undefined) data.cidade = requiredText(body.cidade, "cidade");
  if (body.descricao !== undefined) data.descricao = optionalText(body.descricao, "descricao");
  if (body.nomeLocal !== undefined) data.nomeLocal = optionalText(body.nomeLocal, "nomeLocal");
  if (body.categoriaId !== undefined) data.categoriaId = optionalText(body.categoriaId, "categoriaId");
  if (body.imagemUrl !== undefined) data.imagemUrl = imageUrl(body.imagemUrl);
  if (body.comecaEm !== undefined) data.comecaEm = isoDate(body.comecaEm, "comecaEm");
  if (body.terminaEm !== undefined) data.terminaEm = body.terminaEm === null ? null : isoDate(body.terminaEm, "terminaEm");
  return data;
}

export function assertEndAfterStart(comecaEm: Date, terminaEm: Date | null | undefined): void {
  if (terminaEm && terminaEm.getTime() < comecaEm.getTime()) {
    fail("terminaEm não pode ser anterior a comecaEm");
  }
}

export function parseEventCreate(body: unknown): EventCreateData {
  const input = asObject(body);
  for (const required of ["titulo", "comecaEm", "cidade"]) {
    if (input[required] === undefined) fail(`${required} é obrigatório`);
  }
  const data = parseFields(input) as EventCreateData;
  assertEndAfterStart(data.comecaEm, data.terminaEm);
  return data;
}

export function parseEventUpdate(body: unknown): EventUpdateData {
  const data = parseFields(asObject(body));
  if (Object.keys(data).length === 0) fail("Nenhum campo para atualizar");
  return data;
}

import { decimal, parseLotCreate, type LotCreateData } from "./lotInput";
import { asObject, fail } from "./validation";

export type EventData = {
  titulo: string;
  descricao: string | null;
  imagemUrl: string | null;
  comecaEm: Date;
  terminaEm: Date | null;
  nomeLocal: string | null;
  cidade: string;
  categoriaId: string | null;
  tags: string[];
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  descontoAfiliado: string | null;
  comissaoPromotor: string | null;
};

// Atração enviada pelo app: nome livre, foto opcional e, se tiver conta, o @username dela.
export type AtracaoInput = { nome: string; fotoUrl: string | null; username: string | null };

// Itens que acompanham o evento ao publicar ou editar.
export type EventExtras = { atracoes?: AtracaoInput[]; lotes?: LotCreateData[] };

export type EventCreateData = Partial<EventData> & Pick<EventData, "titulo" | "comecaEm" | "cidade">;
export type EventUpdateData = Partial<EventData>;

const MAX_LENGTH = { titulo: 200, descricao: 5000, nomeLocal: 200, cidade: 100, imagemUrl: 2000, categoriaId: 100, endereco: 300 };

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

const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 24;

// Selos do evento: até 8 textos curtos, sem repetição (maiúsculas não contam).
function tagList(value: unknown): string[] {
  if (!Array.isArray(value)) fail("tags deve ser uma lista de textos");
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.trim() === "") fail("cada tag deve ser um texto não vazio");
    const tag = item.trim();
    if (tag.length > MAX_TAG_LENGTH) fail(`cada tag deve ter no máximo ${MAX_TAG_LENGTH} caracteres`);
    if (!tags.some((existente) => existente.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  if (tags.length > MAX_TAGS) fail(`no máximo ${MAX_TAGS} tags`);
  return tags;
}

const MAX_ATRACOES = 30;
const MAX_LOTES = 20;

function coordinate(value: unknown, name: string, limit: number): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > limit) {
    fail(`${name} deve ser um número entre -${limit} e ${limit}`);
  }
  return value;
}

function atracaoList(value: unknown): AtracaoInput[] {
  if (!Array.isArray(value)) fail("atracoes deve ser uma lista");
  if (value.length > MAX_ATRACOES) fail(`no máximo ${MAX_ATRACOES} atrações`);
  return value.map((item) => {
    const atracao = asObject(item);
    if (typeof atracao.nome !== "string" || atracao.nome.trim() === "") fail("cada atração precisa de um nome");
    if (atracao.nome.trim().length > 100) fail("nome da atração deve ter no máximo 100 caracteres");
    let username: string | null = null;
    if (atracao.username != null && atracao.username !== "") {
      if (typeof atracao.username !== "string") fail("username da atração deve ser um texto");
      username = atracao.username.trim().replace(/^@/, "") || null;
    }
    return {
      nome: atracao.nome.trim(),
      fotoUrl: atracao.fotoUrl == null || atracao.fotoUrl === "" ? null : imageUrl(atracao.fotoUrl),
      username,
    };
  });
}

// Lotes enviados junto com o evento: se um for inválido, nada é publicado.
function lotList(value: unknown): LotCreateData[] {
  if (!Array.isArray(value)) fail("lotes deve ser uma lista");
  if (value.length > MAX_LOTES) fail(`no máximo ${MAX_LOTES} lotes`);
  return value.map((item) => parseLotCreate(item));
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
  if (body.tags !== undefined) data.tags = tagList(body.tags);
  if (body.endereco !== undefined) data.endereco = optionalText(body.endereco, "endereco");
  if (body.descontoAfiliado !== undefined) {
    data.descontoAfiliado = body.descontoAfiliado === null ? null : decimal(body.descontoAfiliado, "descontoAfiliado", 4, 0, 0.9999);
  }
  if (body.comissaoPromotor !== undefined) {
    data.comissaoPromotor = body.comissaoPromotor === null ? null : decimal(body.comissaoPromotor, "comissaoPromotor", 4, 0, 0.9999);
  }
  if (body.latitude !== undefined) data.latitude = coordinate(body.latitude, "latitude", 90);
  if (body.longitude !== undefined) data.longitude = coordinate(body.longitude, "longitude", 180);
  if (body.comecaEm !== undefined) data.comecaEm = isoDate(body.comecaEm, "comecaEm");
  if (body.terminaEm !== undefined) data.terminaEm = body.terminaEm === null ? null : isoDate(body.terminaEm, "terminaEm");
  return data;
}

export function assertEndAfterStart(comecaEm: Date, terminaEm: Date | null | undefined): void {
  if (terminaEm && terminaEm.getTime() < comecaEm.getTime()) {
    fail("terminaEm não pode ser anterior a comecaEm");
  }
}

// Latitude e longitude andam juntas: ou as duas, ou nenhuma.
function assertCoordinatePair(data: EventUpdateData): void {
  if ((data.latitude == null) !== (data.longitude == null)) fail("latitude e longitude devem ser informadas juntas");
}

// Atrações (e lotes, na criação) vêm no mesmo corpo do evento, mas são gravados à parte.
export function parseEventExtras(body: unknown, withLots: boolean): EventExtras {
  const input = asObject(body);
  const extras: EventExtras = {};
  if (input.atracoes !== undefined) extras.atracoes = atracaoList(input.atracoes);
  if (withLots && input.lotes !== undefined) extras.lotes = lotList(input.lotes);
  return extras;
}

export function parseEventCreate(body: unknown): EventCreateData {
  const input = asObject(body);
  for (const required of ["titulo", "comecaEm", "cidade"]) {
    if (input[required] === undefined) fail(`${required} é obrigatório`);
  }
  const data = parseFields(input) as EventCreateData;
  assertEndAfterStart(data.comecaEm, data.terminaEm);
  assertCoordinatePair(data);
  return data;
}

export function parseEventUpdate(body: unknown): EventUpdateData {
  const input = asObject(body);
  const data = parseFields(input);
  if (Object.keys(data).length === 0 && input.atracoes === undefined) fail("Nenhum campo para atualizar");
  if (data.latitude !== undefined || data.longitude !== undefined) assertCoordinatePair(data);
  return data;
}

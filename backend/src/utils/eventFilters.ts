import { AppError } from "./AppError";

export type EventFilterQuery = Record<string, unknown>;

export type NearFilter = { latitude: number; longitude: number; raioKm: number };

export type EventFilters = {
  q?: string;
  categoria?: string;
  cidade?: string;
  tag?: string;
  de?: Date;
  ate?: Date;
  precoMax?: number;
  gratis?: boolean;
  near?: NearFilter;
};

export const RAIO_PADRAO_KM = 25;
export const RAIO_MAXIMO_KM = 500;
const RAIO_TERRA_KM = 6371;

function text(value: unknown, name: string, max = 100): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new AppError(`${name} deve ser um texto`, 400);
  const limpo = value.trim();
  if (limpo.length > max) throw new AppError(`${name} deve ter no máximo ${max} caracteres`, 400);
  return limpo || undefined;
}

function number(value: unknown, name: string, min: number, max: number): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) throw new AppError(`${name} deve ser um número entre ${min} e ${max}`, 400);
  return n;
}

function date(value: unknown, name: string): Date | undefined {
  if (value === undefined || value === "") return undefined;
  const d = typeof value === "string" ? new Date(value) : new Date(NaN);
  if (Number.isNaN(d.getTime())) throw new AppError(`${name} deve ser uma data ISO válida`, 400);
  return d;
}

// Lê os filtros da busca de eventos na query string. Valores inválidos viram 400.
export function parseEventFilters(query: EventFilterQuery): EventFilters {
  const filters: EventFilters = {
    q: text(query.q, "q"),
    categoria: text(query.categoria, "categoria"),
    cidade: text(query.cidade, "cidade"),
    tag: text(query.tag, "tag", 40),
    de: date(query.de, "de"),
    ate: date(query.ate, "ate"),
    precoMax: number(query.precoMax, "precoMax", 0, 1_000_000),
  };
  if (query.gratis !== undefined && query.gratis !== "") {
    if (query.gratis !== "true" && query.gratis !== "false") throw new AppError("gratis deve ser true ou false", 400);
    filters.gratis = query.gratis === "true";
  }
  if (filters.de && filters.ate && filters.ate < filters.de) throw new AppError("ate não pode ser anterior a de", 400);

  const latitude = number(query.latitude, "latitude", -90, 90);
  const longitude = number(query.longitude, "longitude", -180, 180);
  if ((latitude === undefined) !== (longitude === undefined)) {
    throw new AppError("latitude e longitude devem ser informadas juntas", 400);
  }
  const raioKm = number(query.raioKm, "raioKm", 0.1, RAIO_MAXIMO_KM);
  if (raioKm !== undefined && latitude === undefined) throw new AppError("raioKm precisa de latitude e longitude", 400);
  if (latitude !== undefined && longitude !== undefined) {
    filters.near = { latitude, longitude, raioKm: raioKm ?? RAIO_PADRAO_KM };
  }
  return filters;
}

// Distância em km entre dois pontos (fórmula de Haversine).
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Caixa que contém o círculo da busca; o banco filtra por ela e o Haversine refina depois.
export function boundingBox({ latitude, longitude, raioKm }: NearFilter) {
  const dLat = (raioKm / RAIO_TERRA_KM) * (180 / Math.PI);
  const dLon = dLat / Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
  return {
    latMin: latitude - dLat,
    latMax: latitude + dLat,
    lonMin: Math.max(-180, longitude - dLon),
    lonMax: Math.min(180, longitude + dLon),
  };
}

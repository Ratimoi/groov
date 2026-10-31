import type { AuthUser } from "./auth";

export type RatingBody = { nota?: unknown; comentario?: unknown };

export type RatingStats = { media: number | null; total: number };

export type RatingSummary = {
  evento: RatingStats;
  organizador: ({ id: string; nome: string; username: string; avatarUrl: string | null } & RatingStats) | null;
};

export type Rating = { id: string; eventoId: string; usuarioId: string; nota: number; comentario: string | null; criadoEm: Date };

export type RatingEvent = {
  id: string;
  criadoPorId: string | null;
  criadoPor: { id: string; nome: string; username: string; avatarUrl: string | null } | null;
};

export interface RatingServiceContract {
  summary(eventoId: string): Promise<RatingSummary>;
  rate(eventoId: string, body: RatingBody, actor: AuthUser): Promise<Rating>;
}

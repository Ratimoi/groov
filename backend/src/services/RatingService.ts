import { RatingModel } from "../models/RatingModel";
import type { AuthUser } from "../types/auth";
import type { Rating, RatingBody, RatingServiceContract, RatingSummary } from "../types/rating";
import { AppError } from "../utils/AppError";
import { asObject, fail } from "../utils/validation";

const MAX_COMMENT_LENGTH = 500;

export class RatingService implements RatingServiceContract {
  private ratingModel: RatingModel;

  constructor(ratingModel: RatingModel = new RatingModel()) {
    this.ratingModel = ratingModel;
  }

  async summary(eventoId: string): Promise<RatingSummary> {
    const evento = await this.ratingModel.findEvent(eventoId);
    if (!evento) throw new AppError("Evento não encontrado", 404);
    return this.ratingModel.summary(evento);
  }

  // Só quem foi ao evento (ingresso já validado na portaria) avalia, e nunca o próprio organizador.
  async rate(eventoId: string, body: RatingBody, actor: AuthUser): Promise<Rating> {
    const { nota, comentario } = asObject(body);
    if (typeof nota !== "number" || !Number.isInteger(nota) || nota < 1 || nota > 5) fail("nota deve ser um inteiro de 1 a 5");
    if (comentario !== undefined && comentario !== null && typeof comentario !== "string") fail("comentario deve ser um texto");
    const texto = typeof comentario === "string" ? comentario.trim() : "";
    if (texto.length > MAX_COMMENT_LENGTH) fail(`comentario deve ter no máximo ${MAX_COMMENT_LENGTH} caracteres`);

    const evento = await this.ratingModel.findEvent(eventoId);
    if (!evento) throw new AppError("Evento não encontrado", 404);
    if (evento.criadoPorId === actor.id) throw new AppError("Você não pode avaliar o próprio evento", 403);
    if (!(await this.ratingModel.hasAttended(eventoId, actor.id))) {
      throw new AppError("Só quem foi ao evento pode avaliar", 403);
    }
    return this.ratingModel.upsert(eventoId, actor.id, nota, texto === "" ? null : texto);
  }
}

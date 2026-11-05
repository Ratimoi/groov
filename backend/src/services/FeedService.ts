import { FeedModel, type FeedAba, type FeedCursor } from "../models/FeedModel";
import type { AuthUser } from "../types/auth";
import { AppError } from "../utils/AppError";

const ABAS: FeedAba[] = ["todos", "seguindo", "salvos"];
const LIMITE_PADRAO = 10;
const LIMITE_MAXIMO = 30;

export function encodeCursor(criadoEm: Date, id: string): string {
  return Buffer.from(`${criadoEm.toISOString()}|${id}`).toString("base64url");
}

function decodeCursor(valor: unknown): FeedCursor | null {
  if (valor === undefined || valor === "") return null;
  if (typeof valor !== "string") throw new AppError("cursor inválido", 400);
  const [iso, id] = Buffer.from(valor, "base64url").toString().split("|");
  const data = new Date(iso);
  if (!id || Number.isNaN(data.getTime())) throw new AppError("cursor inválido", 400);
  return { criadoEm: data, id };
}

type LoteResumo = { preco: { toString(): string }; quantidade: number; quantidadeVendida: number; quantidadeReservada: number };

// Menor preço entre os lotes que ainda têm ingresso; null quando está esgotado (ou sem lotes).
function menorPreco(lotes: LoteResumo[]): string | null {
  const precos = lotes
    .filter((l) => l.quantidade - l.quantidadeVendida - l.quantidadeReservada > 0)
    .map((l) => Number(l.preco.toString()));
  return precos.length ? Math.min(...precos).toFixed(2) : null;
}

export class FeedService {
  constructor(private feedModel: FeedModel = new FeedModel()) {}

  async feed(query: { cursor?: unknown; limit?: unknown; aba?: unknown }, actor: AuthUser) {
    const aba = (query.aba ?? "todos") as FeedAba;
    if (!ABAS.includes(aba)) throw new AppError("aba deve ser todos, seguindo ou salvos", 400);
    const limite = query.limit === undefined ? LIMITE_PADRAO : Number(query.limit);
    if (!Number.isInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO) {
      throw new AppError(`limit deve ser um inteiro de 1 a ${LIMITE_MAXIMO}`, 400);
    }

    const linhas = await this.feedModel.findPage({
      usuarioId: actor.id,
      aba,
      cursor: decodeCursor(query.cursor),
      limit: limite,
      agora: new Date(),
    });
    const temMais = linhas.length > limite;
    const pagina = temMais ? linhas.slice(0, limite) : linhas;

    const organizadorIds = [...new Set(pagina.map((e) => e.criadoPorId).filter((id): id is string => !!id))];
    const estado = await this.feedModel.viewerState(actor.id, pagina.map((e) => e.id), organizadorIds);

    const data = pagina.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      descricao: e.descricao,
      imagemUrl: e.imagemUrl,
      comecaEm: e.comecaEm,
      terminaEm: e.terminaEm,
      nomeLocal: e.nomeLocal,
      cidade: e.cidade,
      tags: e.tags,
      criadoEm: e.criadoEm,
      organizador: e.criadoPor,
      atracoes: e.atracoes,
      menorPreco: menorPreco(e.lotes),
      curtidas: e._count.curtidas,
      curtido: estado.curtidos.has(e.id),
      salvo: estado.salvos.has(e.id),
      seguindo: e.criadoPorId ? estado.seguidos.has(e.criadoPorId) : false,
    }));
    const ultimo = pagina[pagina.length - 1];
    return { data, nextCursor: temMais && ultimo ? encodeCursor(ultimo.criadoEm, ultimo.id) : null };
  }

  private async assertEvent(eventoId: string) {
    if (!(await this.feedModel.eventExists(eventoId))) throw new AppError("Evento não encontrado", 404);
  }

  async like(eventoId: string, actor: AuthUser) {
    await this.assertEvent(eventoId);
    await this.feedModel.like(eventoId, actor.id);
    return { curtido: true, curtidas: await this.feedModel.countLikes(eventoId) };
  }

  async unlike(eventoId: string, actor: AuthUser) {
    await this.assertEvent(eventoId);
    await this.feedModel.unlike(eventoId, actor.id);
    return { curtido: false, curtidas: await this.feedModel.countLikes(eventoId) };
  }

  async save(eventoId: string, actor: AuthUser) {
    await this.assertEvent(eventoId);
    await this.feedModel.save(eventoId, actor.id);
    return { salvo: true };
  }

  async unsave(eventoId: string, actor: AuthUser) {
    await this.assertEvent(eventoId);
    await this.feedModel.unsave(eventoId, actor.id);
    return { salvo: false };
  }

  private async assertFollowable(usuarioId: string, actor: AuthUser) {
    if (usuarioId === actor.id) throw new AppError("Você não pode seguir a si mesmo", 400);
    if (!(await this.feedModel.userExists(usuarioId))) throw new AppError("Usuário não encontrado", 404);
  }

  async follow(usuarioId: string, actor: AuthUser) {
    await this.assertFollowable(usuarioId, actor);
    await this.feedModel.follow(actor.id, usuarioId);
    return { seguindo: true };
  }

  async unfollow(usuarioId: string, actor: AuthUser) {
    await this.feedModel.unfollow(actor.id, usuarioId);
    return { seguindo: false };
  }
}

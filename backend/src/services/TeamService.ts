import type { CargoEvento } from "@prisma/client";
import { EventModel } from "../models/EventModel";
import { TeamModel } from "../models/TeamModel";
import { UserModel } from "../models/UserModel";
import type { AuthUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { assertCanManageEvent } from "../utils/eventAccess";
import { asObject, fail } from "../utils/validation";

const CARGOS: CargoEvento[] = ["PROMOTOR", "VALIDADOR"];

// Promotor identificado por um código válido, com as condições do evento (frações: 0.1 = 10%).
export type Affiliate = { promotorId: string; codigo: string; desconto: number; comissao: number; promotor: { nome: string; username: string } };

export class TeamService {
  constructor(
    private teamModel: TeamModel = new TeamModel(),
    private eventModel: EventModel = new EventModel(),
    private userModel: UserModel = new UserModel(),
  ) {}

  private async managedEvent(eventoId: string, actor: AuthUser) {
    const evento = await this.eventModel.findById(eventoId);
    if (!evento) throw new AppError("Evento não encontrado", 404);
    assertCanManageEvent(evento.criadoPorId, actor);
    return evento;
  }

  // Equipe com as vendas de cada promotor (ingressos e comissão).
  async list(eventoId: string, actor: AuthUser) {
    await this.managedEvent(eventoId, actor);
    const [membros, vendas] = await Promise.all([this.teamModel.list(eventoId), this.teamModel.salesByPromoter(eventoId)]);
    const porPromotor = new Map(vendas.map((v) => [v.promotorId, v]));
    return membros.map((m) => {
      const v = porPromotor.get(m.usuarioId);
      return { ...m, vendas: { pedidos: v?.pedidos ?? 0, ingressos: v?.ingressos ?? 0, comissao: Number(v?.comissao ?? 0).toFixed(2) } };
    });
  }

  // Código válido neste evento e que não é do próprio comprador. Devolve null se não valer.
  async lookupAffiliate(eventoId: string, codigo: string, compradorId: string): Promise<Affiliate | null> {
    const afiliado = await this.teamModel.findAffiliate(eventoId, codigo.trim().toUpperCase());
    if (!afiliado || afiliado.usuarioId === compradorId || !afiliado.codigoAfiliado) return null;
    return {
      promotorId: afiliado.usuarioId,
      codigo: afiliado.codigoAfiliado,
      desconto: Number(afiliado.evento.descontoAfiliado ?? 0),
      comissao: Number(afiliado.evento.comissaoPromotor ?? 0),
      promotor: { nome: afiliado.usuario.nome, username: afiliado.usuario.username },
    };
  }

  // Igual a lookupAffiliate, mas explica o motivo quando o código não vale (usado ao comprar).
  async resolveAffiliate(eventoId: string, codigo: string, compradorId: string): Promise<Affiliate> {
    const afiliado = await this.lookupAffiliate(eventoId, codigo, compradorId);
    if (afiliado) return afiliado;
    const dono = await this.teamModel.findAffiliate(eventoId, codigo.trim().toUpperCase());
    throw new AppError(dono ? "Você não pode usar o seu próprio código de promotor" : "Código de promotor inválido para este evento", 400);
  }

  // Dados que o app mostra antes de comprar, para confirmar o desconto.
  async checkCode(eventoId: string, codigo: string, actor: AuthUser) {
    const afiliado = await this.lookupAffiliate(eventoId, codigo, actor.id);
    if (!afiliado) throw new AppError("Código de promotor inválido para este evento", 404);
    return { codigo: afiliado.codigo, descontoAfiliado: afiliado.desconto, promotor: afiliado.promotor };
  }

  // Painel do promotor: o código, as condições e quanto já vendeu.
  async promoterPanel(eventoId: string, actor: AuthUser) {
    const promotor = await this.teamModel.findPromoter(eventoId, actor.id);
    if (!promotor) throw new AppError("Você não é promotor deste evento", 403);
    const vendas = (await this.teamModel.salesByPromoter(eventoId)).find((v) => v.promotorId === actor.id);
    return {
      evento: promotor.evento.titulo,
      codigo: promotor.codigoAfiliado,
      descontoAfiliado: Number(promotor.evento.descontoAfiliado ?? 0),
      comissaoPromotor: Number(promotor.evento.comissaoPromotor ?? 0),
      pedidos: vendas?.pedidos ?? 0,
      ingressos: vendas?.ingressos ?? 0,
      comissaoTotal: Number(vendas?.comissao ?? 0).toFixed(2),
    };
  }

  async add(eventoId: string, body: unknown, actor: AuthUser) {
    const evento = await this.managedEvent(eventoId, actor);
    const { username, cargo } = asObject(body);
    if (typeof username !== "string" || username.trim() === "") fail("username é obrigatório");
    if (typeof cargo !== "string" || !CARGOS.includes(cargo as CargoEvento)) fail("cargo deve ser PROMOTOR ou VALIDADOR");

    const usuarioId = await this.userModel.findIdByUsername(username.trim().replace(/^@/, ""));
    if (!usuarioId) throw new AppError("Usuário não encontrado", 404);
    if (usuarioId === evento.criadoPorId) throw new AppError("O gerente já tem acesso total ao evento", 400);
    return this.teamModel.upsert(eventoId, usuarioId, cargo as CargoEvento);
  }

  async remove(eventoId: string, usuarioId: string, actor: AuthUser): Promise<void> {
    await this.managedEvent(eventoId, actor);
    if (!(await this.teamModel.remove(eventoId, usuarioId))) throw new AppError("Membro não encontrado", 404);
  }

  myEvents(actor: AuthUser) {
    return this.teamModel.findEventsOf(actor.id);
  }

  // Gerente do evento ou VALIDADOR dele.
  async canValidateEvent(eventoId: string, actor: AuthUser, criadoPorId: string | null): Promise<boolean> {
    if (criadoPorId === actor.id) return true;
    return (await this.teamModel.findCargo(eventoId, actor.id)) === "VALIDADOR";
  }

  canValidateAny(actor: AuthUser): Promise<boolean> {
    return this.teamModel.canValidateAny(actor.id);
  }
}

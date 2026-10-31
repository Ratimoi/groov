import { GroupMemberModel } from "../models/GroupMemberModel";
import { GroupModel } from "../models/GroupModel";
import { GroupPurchaseModel } from "../models/GroupPurchaseModel";
import { LotModel } from "../models/LotModel";
import type { AuthUser } from "../types/auth";
import type {
  GroupPurchase,
  GroupPurchaseCreateBody,
  GroupPurchaseServiceContract,
} from "../types/groupPurchase";
import { AppError } from "../utils/AppError";
import { serviceFeeCents, toCents } from "../utils/money";

const HOUR_IN_MS = 60 * 60 * 1000;

export class GroupPurchaseService implements GroupPurchaseServiceContract {
  private groupPurchaseModel: GroupPurchaseModel;
  private groupModel: GroupModel;
  private groupMemberModel: GroupMemberModel;
  private lotModel: LotModel;

  constructor(
    groupPurchaseModel: GroupPurchaseModel = new GroupPurchaseModel(),
    groupModel: GroupModel = new GroupModel(),
    groupMemberModel: GroupMemberModel = new GroupMemberModel(),
    lotModel: LotModel = new LotModel(),
  ) {
    this.groupPurchaseModel = groupPurchaseModel;
    this.groupModel = groupModel;
    this.groupMemberModel = groupMemberModel;
    this.lotModel = lotModel;
  }

  // O iniciador é sempre quem está logado. Como ele entra na lista de participantes, a regra de
  // "todos pertencem ao grupo" também garante que só um membro inicia uma compra do grupo.
  async create(body: GroupPurchaseCreateBody, actor: AuthUser): Promise<GroupPurchase> {
    const data = { ...body, iniciadorId: actor.id };

    if (!Array.isArray(data.participantesIds)) {
      throw new AppError("participantesIds deve ser uma lista de ids de usuários", 400);
    }

    const lote = await this.lotModel.findById(data.loteId);
    if (!lote) {
      throw new AppError("Lote não encontrado", 404);
    }
    if (!lote.tamanhoGrupo || !lote.prazoGrupoHoras) {
      throw new AppError("Este lote não aceita compra em grupo", 400);
    }

    const group = await this.groupModel.findById(data.grupoId);
    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    const participantesIds = [...new Set([data.iniciadorId, ...data.participantesIds])];
    if (participantesIds.length !== lote.tamanhoGrupo) {
      throw new AppError(
        `A compra em grupo deste lote exige exatamente ${lote.tamanhoGrupo} participantes, incluindo o iniciador`,
        400,
      );
    }

    const members = await this.groupMemberModel.findByGroup(data.grupoId);
    const memberIds = new Set(members.map((member) => member.usuarioId));
    const naoMembros = participantesIds.filter((id) => !memberIds.has(id));
    if (naoMembros.length > 0) {
      throw new AppError(`Usuários não pertencem ao grupo: ${naoMembros.join(", ")}`, 400);
    }

    const comCompraPendente = await this.groupPurchaseModel.findPendingParticipantIds(
      participantesIds,
      lote.eventoId,
    );
    if (comCompraPendente.length > 0) {
      throw new AppError(
        `Usuários já possuem compra em grupo pendente para este evento: ${comCompraPendente.join(", ")}`,
        409,
      );
    }

    const purchase = await this.groupPurchaseModel.createWithReservation({
      grupoId: data.grupoId,
      loteId: data.loteId,
      iniciadorId: data.iniciadorId,
      expiraEm: new Date(Date.now() + lote.prazoGrupoHoras * HOUR_IN_MS),
      participantesIds,
    });
    if (!purchase) {
      throw new AppError("Ingressos insuficientes no lote para esta compra em grupo", 409);
    }

    return purchase;
  }

  // ADMIN vê todas; os demais, só as compras de que participam.
  async findAll(actor: AuthUser): Promise<GroupPurchase[]> {
    const usuarioId = actor.papel === "ADMIN" ? undefined : actor.id;
    const purchases = await this.groupPurchaseModel.findAll(usuarioId);

    // Compras com prazo vencido expiram aqui, na primeira consulta (não há tarefa agendada).
    const expirou = await this.expireDue(purchases);
    return expirou ? this.groupPurchaseModel.findAll(usuarioId) : purchases;
  }

  async findById(id: string, actor: AuthUser): Promise<GroupPurchase | null> {
    let purchase = await this.groupPurchaseModel.findById(id);
    if (!purchase) return null;

    const participates = purchase.participantes.some((participante) => participante.usuarioId === actor.id);
    if (actor.papel !== "ADMIN" && !participates) return null;

    if (await this.expireDue([purchase])) purchase = await this.groupPurchaseModel.findById(id);
    return purchase;
  }

  // Pagamento simulado da cota do próprio usuário. Quando o último participante paga, a compra
  // é confirmada e os ingressos de todos são emitidos.
  async pay(id: string, actor: AuthUser): Promise<GroupPurchase> {
    const purchase = await this.groupPurchaseModel.findById(id);
    const participante = purchase?.participantes.find((item) => item.usuarioId === actor.id);
    if (!purchase) throw new AppError("Compra em grupo não encontrada", 404);
    if (!participante) {
      throw new AppError(
        actor.papel === "ADMIN" ? "Você não participa desta compra" : "Compra em grupo não encontrada",
        actor.papel === "ADMIN" ? 403 : 404,
      );
    }

    if (await this.expireDue([purchase])) throw new AppError("O prazo desta compra em grupo expirou", 409);
    if (purchase.status === "EXPIRADA") throw new AppError("O prazo desta compra em grupo expirou", 409);
    if (purchase.status === "CONFIRMADA") throw new AppError("Esta compra em grupo já foi confirmada", 409);
    if (participante.status !== "PENDENTE") throw new AppError("Você já pagou a sua parte", 409);

    const lote = await this.lotModel.findById(purchase.loteId);
    if (!lote) throw new AppError("Lote não encontrado", 404);

    // Cada participante paga o preço do lote com o desconto do grupo (o preço vem do banco).
    const subtotalCents = toCents(lote.preco);
    const cotaCents = Math.round(subtotalCents * (1 - Number(lote.descontoGrupo ?? 0)));
    const paid = await this.groupPurchaseModel.payShare({
      compraId: purchase.id,
      usuarioId: actor.id,
      eventoId: lote.eventoId,
      loteId: lote.id,
      subtotalCents,
      descontoCents: subtotalCents - cotaCents,
      taxaServicoCents: serviceFeeCents(cotaCents),
    });
    if (!paid) throw new AppError("Você já pagou a sua parte", 409);

    return paid;
  }

  private async expireDue(purchases: GroupPurchase[]): Promise<boolean> {
    const now = new Date();
    let expirou = false;
    for (const purchase of purchases) {
      if (purchase.status === "PENDENTE" && purchase.expiraEm <= now) {
        if (await this.groupPurchaseModel.expire(purchase.id, now)) expirou = true;
      }
    }
    return expirou;
  }
}

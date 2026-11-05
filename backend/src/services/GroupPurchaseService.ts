import { GroupMemberModel } from "../models/GroupMemberModel";
import { GroupModel } from "../models/GroupModel";
import { GroupPurchaseModel } from "../models/GroupPurchaseModel";
import { LotModel } from "../models/LotModel";
import type { AuthUser } from "../types/auth";
import type {
  GroupPurchase,
  GroupPurchaseCreateBody,
  GroupPurchasePayBody,
  GroupPurchaseServiceContract,
} from "../types/groupPurchase";
import { AppError } from "../utils/AppError";
import { fractionOfCents, serviceFeeCents, toCents } from "../utils/money";
import { TeamService } from "./TeamService";

const HOUR_IN_MS = 60 * 60 * 1000;

export class GroupPurchaseService implements GroupPurchaseServiceContract {
  private groupPurchaseModel: GroupPurchaseModel;
  private groupModel: GroupModel;
  private groupMemberModel: GroupMemberModel;
  private lotModel: LotModel;
  private teamService: TeamService;

  constructor(
    groupPurchaseModel: GroupPurchaseModel = new GroupPurchaseModel(),
    groupModel: GroupModel = new GroupModel(),
    groupMemberModel: GroupMemberModel = new GroupMemberModel(),
    lotModel: LotModel = new LotModel(),
    teamService: TeamService = new TeamService(),
  ) {
    this.groupPurchaseModel = groupPurchaseModel;
    this.groupModel = groupModel;
    this.groupMemberModel = groupMemberModel;
    this.lotModel = lotModel;
    this.teamService = teamService;
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

    // Código de promotor opcional: confere já aqui para o app avisar antes de reservar.
    let codigoAfiliado: string | undefined;
    if (data.codigoAfiliado) {
      if (typeof data.codigoAfiliado !== "string" || data.codigoAfiliado.length > 32) {
        throw new AppError("codigoAfiliado inválido", 400);
      }
      codigoAfiliado = (await this.teamService.resolveAffiliate(lote.eventoId, data.codigoAfiliado, actor.id)).codigo;
    }

    const purchase = await this.groupPurchaseModel.createWithReservation({
      codigoAfiliado,
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

  // Pagamento simulado. Por padrão cada participante paga a própria cota; com `todos: true` o
  // iniciador paga também as cotas pendentes dos demais. Quando a última cota é paga, a compra é
  // confirmada e os ingressos de todos são emitidos (cada um no nome do seu dono).
  async pay(id: string, actor: AuthUser, body?: GroupPurchasePayBody): Promise<GroupPurchase> {
    const todos = body?.todos === true;
    const purchase = await this.groupPurchaseModel.findById(id);
    const participante = purchase?.participantes.find((item) => item.usuarioId === actor.id);
    if (!purchase) throw new AppError("Compra em grupo não encontrada", 404);
    if (!participante) {
      throw new AppError(
        actor.papel === "ADMIN" ? "Você não participa desta compra" : "Compra em grupo não encontrada",
        actor.papel === "ADMIN" ? 403 : 404,
      );
    }
    if (todos && purchase.iniciadorId !== actor.id) {
      throw new AppError("Só quem iniciou a compra pode pagar pelo grupo todo", 403);
    }

    if (await this.expireDue([purchase])) throw new AppError("O prazo desta compra em grupo expirou", 409);
    if (purchase.status === "EXPIRADA") throw new AppError("O prazo desta compra em grupo expirou", 409);
    if (purchase.status === "CONFIRMADA") throw new AppError("Esta compra em grupo já foi confirmada", 409);

    const devedores = todos
      ? purchase.participantes.filter((item) => item.status === "PENDENTE")
      : participante.status === "PENDENTE"
        ? [participante]
        : [];
    if (devedores.length === 0) {
      throw new AppError(todos ? "Não há cotas pendentes para pagar" : "Você já pagou a sua parte", 409);
    }

    const lote = await this.lotModel.findById(purchase.loteId);
    if (!lote) throw new AppError("Lote não encontrado", 404);

    // Cada cota é o preço do lote com o desconto (o preço vem do banco). Com código de promotor vale
    // o maior entre o desconto do grupo e o do promotor (não somam); a comissão do promotor é
    // registrada sempre que o código vale, pois foi ele quem trouxe a venda.
    const subtotalCents = toCents(lote.preco);
    const descontoGrupo = Number(lote.descontoGrupo ?? 0);

    let atualizada: GroupPurchase | null = null;
    for (const devedor of devedores) {
      const afiliado = purchase.codigoAfiliado
        ? await this.teamService.lookupAffiliate(lote.eventoId, purchase.codigoAfiliado, devedor.usuarioId)
        : null;
      const descontoCents = fractionOfCents(subtotalCents, Math.max(descontoGrupo, afiliado?.desconto ?? 0));
      const cotaCents = subtotalCents - descontoCents;
      const paid = await this.groupPurchaseModel.payShare({
        compraId: purchase.id,
        usuarioId: devedor.usuarioId,
        eventoId: lote.eventoId,
        loteId: lote.id,
        subtotalCents,
        descontoCents,
        taxaServicoCents: serviceFeeCents(cotaCents),
        ...(afiliado
          ? { promotorId: afiliado.promotorId, codigoAfiliado: afiliado.codigo, comissaoCents: fractionOfCents(cotaCents, afiliado.comissao) }
          : {}),
      });
      if (!paid) throw new AppError(devedor.usuarioId === actor.id ? "Você já pagou a sua parte" : "Uma das cotas já foi paga", 409);
      atualizada = paid;
    }

    return atualizada as GroupPurchase;
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

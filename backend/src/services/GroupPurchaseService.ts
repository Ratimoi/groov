import { GroupMemberModel } from "../models/GroupMemberModel";
import { GroupModel } from "../models/GroupModel";
import { GroupPurchaseModel } from "../models/GroupPurchaseModel";
import { LotModel } from "../models/LotModel";
import type {
  GroupPurchase,
  GroupPurchaseCreateRequest,
  GroupPurchaseServiceContract,
} from "../types/groupPurchase";
import { AppError } from "../utils/AppError";

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

  async create(data: GroupPurchaseCreateRequest): Promise<GroupPurchase> {
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

  async findAll(): Promise<GroupPurchase[]> {
    return this.groupPurchaseModel.findAll();
  }

  async findById(id: string): Promise<GroupPurchase | null> {
    return this.groupPurchaseModel.findById(id);
  }
}

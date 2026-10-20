import { Prisma, type Lote } from "@prisma/client";
import { EventModel } from "../models/EventModel";
import { LotModel } from "../models/LotModel";
import type { AuthUser } from "../types/auth";
import type { LotDto, LotServiceContract } from "../types/lot";
import { AppError } from "../utils/AppError";
import { assertCanManageEvent } from "../utils/eventAccess";
import { assertGroupConfig, parseLotCreate, parseLotUpdate } from "../utils/lotInput";

export function toLotDto(lote: Lote): LotDto {
  return {
    id: lote.id,
    eventoId: lote.eventoId,
    nome: lote.nome,
    preco: new Prisma.Decimal(lote.preco).toFixed(2),
    quantidade: lote.quantidade,
    quantidadeVendida: lote.quantidadeVendida,
    quantidadeReservada: lote.quantidadeReservada,
    quantidadeDisponivel: Math.max(0, lote.quantidade - lote.quantidadeVendida - lote.quantidadeReservada),
    tamanhoGrupo: lote.tamanhoGrupo,
    descontoGrupo: lote.descontoGrupo === null ? null : new Prisma.Decimal(lote.descontoGrupo).toFixed(4),
    prazoGrupoHoras: lote.prazoGrupoHoras,
    criadoEm: lote.criadoEm,
  };
}

function sameDecimal(a: unknown, b: unknown): boolean {
  if (a === null || b === null) return a === b;
  return new Prisma.Decimal(a as Prisma.Decimal.Value).equals(b as Prisma.Decimal.Value);
}

export class LotService implements LotServiceContract {
  private lotModel: LotModel;
  private eventModel: EventModel;

  constructor(lotModel: LotModel = new LotModel(), eventModel: EventModel = new EventModel()) {
    this.lotModel = lotModel;
    this.eventModel = eventModel;
  }

  async findByEvent(eventoId: string): Promise<LotDto[]> {
    await this.findEventOrThrow(eventoId);
    return (await this.lotModel.findByEvent(eventoId)).map(toLotDto);
  }

  async findById(id: string): Promise<LotDto | null> {
    const lote = await this.lotModel.findById(id);
    return lote ? toLotDto(lote) : null;
  }

  async create(eventoId: string, body: unknown, actor: AuthUser): Promise<LotDto> {
    const event = await this.findEventOrThrow(eventoId);
    assertCanManageEvent(event.criadoPorId, actor);
    return toLotDto(await this.lotModel.create(eventoId, parseLotCreate(body)));
  }

  async update(id: string, body: unknown, actor: AuthUser): Promise<LotDto | null> {
    const lote = await this.lotModel.findByIdWithEventOwner(id);
    if (!lote) return null;
    assertCanManageEvent(lote.evento.criadoPorId, actor);

    const data = parseLotUpdate(body);

    // A regra de grupo é checada sobre o resultado final (o que já existe + o que mudou).
    assertGroupConfig({
      tamanhoGrupo: data.tamanhoGrupo !== undefined ? data.tamanhoGrupo : lote.tamanhoGrupo,
      prazoGrupoHoras: data.prazoGrupoHoras !== undefined ? data.prazoGrupoHoras : lote.prazoGrupoHoras,
      descontoGrupo: data.descontoGrupo !== undefined ? data.descontoGrupo : lote.descontoGrupo,
    });

    const comprometidos = lote.quantidadeVendida + lote.quantidadeReservada;
    if (data.quantidade !== undefined && data.quantidade < comprometidos) {
      throw new AppError(
        `quantidade não pode ser menor que os ingressos já vendidos ou reservados (${comprometidos})`,
        409,
      );
    }

    const mudouConfigDeGrupo =
      (data.tamanhoGrupo !== undefined && data.tamanhoGrupo !== lote.tamanhoGrupo) ||
      (data.prazoGrupoHoras !== undefined && data.prazoGrupoHoras !== lote.prazoGrupoHoras) ||
      (data.descontoGrupo !== undefined && !sameDecimal(data.descontoGrupo, lote.descontoGrupo));
    if (mudouConfigDeGrupo && lote.quantidadeReservada > 0) {
      throw new AppError("A configuração de compra em grupo não pode mudar enquanto houver ingressos reservados", 409);
    }

    const atualizado = await this.lotModel.update(id, data);
    return atualizado ? toLotDto(atualizado) : null;
  }

  async delete(id: string, actor: AuthUser): Promise<boolean> {
    const lote = await this.lotModel.findByIdWithEventOwner(id);
    if (!lote) return false;
    assertCanManageEvent(lote.evento.criadoPorId, actor);

    if (lote.quantidadeVendida > 0 || lote.quantidadeReservada > 0) {
      throw new AppError("Lote com ingressos vendidos ou reservados não pode ser apagado", 409);
    }
    return this.lotModel.delete(id);
  }

  private async findEventOrThrow(eventoId: string) {
    const event = await this.eventModel.findById(eventoId);
    if (!event) {
      throw new AppError("Evento não encontrado", 404);
    }
    return event;
  }
}

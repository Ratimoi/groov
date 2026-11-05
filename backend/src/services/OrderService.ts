import { LotModel } from "../models/LotModel";
import { OrderModel } from "../models/OrderModel";
import type { AuthUser } from "../types/auth";
import { MAX_TICKETS_PER_ORDER, type Order, type OrderCreateBody, type OrderServiceContract } from "../types/order";
import { AppError } from "../utils/AppError";
import { fractionOfCents, serviceFeeCents, toCents } from "../utils/money";
import { TeamService } from "./TeamService";
import { asObject, fail } from "../utils/validation";

export class OrderService implements OrderServiceContract {
  private orderModel: OrderModel;
  private lotModel: LotModel;

  private teamService: TeamService;

  constructor(
    orderModel: OrderModel = new OrderModel(),
    lotModel: LotModel = new LotModel(),
    teamService: TeamService = new TeamService(),
  ) {
    this.orderModel = orderModel;
    this.lotModel = lotModel;
    this.teamService = teamService;
  }

  async create(body: OrderCreateBody, actor: AuthUser): Promise<Order> {
    const { loteId, quantidade, codigoAfiliado } = asObject(body);

    if (typeof loteId !== "string" || loteId.trim() === "") fail("loteId é obrigatório");
    if (typeof quantidade !== "number" || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_TICKETS_PER_ORDER) {
      fail(`quantidade deve ser um inteiro de 1 a ${MAX_TICKETS_PER_ORDER}`);
    }

    if (codigoAfiliado !== undefined && codigoAfiliado !== null && (typeof codigoAfiliado !== "string" || codigoAfiliado.length > 32)) {
      fail("codigoAfiliado inválido");
    }

    const lote = await this.lotModel.findById(loteId);
    if (!lote) throw new AppError("Lote não encontrado", 404);

    const afiliado = codigoAfiliado ? await this.teamService.resolveAffiliate(lote.eventoId, codigoAfiliado, actor.id) : null;

    // O preço vem sempre do lote no banco, nunca do corpo da requisição.
    const subtotalCents = toCents(lote.preco) * quantidade;
    const descontoCents = afiliado ? fractionOfCents(subtotalCents, afiliado.desconto) : 0;
    const baseCents = subtotalCents - descontoCents;
    const order = await this.orderModel.createPaid({
      usuarioId: actor.id,
      eventoId: lote.eventoId,
      loteId: lote.id,
      quantidade,
      subtotalCents,
      descontoCents,
      taxaServicoCents: serviceFeeCents(baseCents),
      ...(afiliado
        ? { promotorId: afiliado.promotorId, codigoAfiliado: afiliado.codigo, comissaoCents: fractionOfCents(baseCents, afiliado.comissao) }
        : {}),
    });
    if (!order) throw new AppError("Ingressos insuficientes neste lote", 409);

    return order;
  }
}

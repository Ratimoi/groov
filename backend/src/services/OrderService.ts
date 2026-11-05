import { LotModel } from "../models/LotModel";
import { OrderModel } from "../models/OrderModel";
import type { AuthUser } from "../types/auth";
import { MAX_TICKETS_PER_ORDER, type Order, type OrderCreateBody, type OrderServiceContract } from "../types/order";
import { AppError } from "../utils/AppError";
import { serviceFeeCents, toCents } from "../utils/money";
import { asObject, fail } from "../utils/validation";

export class OrderService implements OrderServiceContract {
  private orderModel: OrderModel;
  private lotModel: LotModel;

  constructor(orderModel: OrderModel = new OrderModel(), lotModel: LotModel = new LotModel()) {
    this.orderModel = orderModel;
    this.lotModel = lotModel;
  }

  async create(body: OrderCreateBody, actor: AuthUser): Promise<Order> {
    const { loteId, quantidade } = asObject(body);

    if (typeof loteId !== "string" || loteId.trim() === "") fail("loteId é obrigatório");
    if (typeof quantidade !== "number" || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_TICKETS_PER_ORDER) {
      fail(`quantidade deve ser um inteiro de 1 a ${MAX_TICKETS_PER_ORDER}`);
    }

    const lote = await this.lotModel.findById(loteId);
    if (!lote) throw new AppError("Lote não encontrado", 404);

    // O preço vem sempre do lote no banco, nunca do corpo da requisição.
    const subtotalCents = toCents(lote.preco) * quantidade;
    const order = await this.orderModel.createPaid({
      usuarioId: actor.id,
      eventoId: lote.eventoId,
      loteId: lote.id,
      quantidade,
      subtotalCents,
      taxaServicoCents: serviceFeeCents(subtotalCents),
    });
    if (!order) throw new AppError("Ingressos insuficientes neste lote", 409);

    return order;
  }
}

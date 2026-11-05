import type { Pagamento } from "@prisma/client";
import { GroupPurchaseModel } from "../models/GroupPurchaseModel";
import { PaymentModel } from "../models/PaymentModel";
import type { AuthUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { fromCents } from "../utils/money";
import { asObject, fail } from "../utils/validation";
import { GroupPurchaseService } from "./GroupPurchaseService";
import { OrderService } from "./OrderService";
import { createPaymentProvider, type PaymentProvider } from "./payments";
import type { PaymentMethod } from "./payments/PaymentProvider";

const MAX_ITENS = 10;
const VALIDADE_MIN = 30;

type ItemPedido = { tipo: "PEDIDO"; loteId: string; quantidade: number; codigoAfiliado?: string };
type ItemCota = { tipo: "COTA"; compraId: string; todos?: boolean };
export type PaymentItem = ItemPedido | ItemCota;

type Resultado = { pedidoIds: string[]; compraIds: string[] };

function parseItens(valor: unknown): PaymentItem[] {
  if (!Array.isArray(valor) || valor.length === 0) fail("itens deve ser uma lista com ao menos um item");
  if (valor.length > MAX_ITENS) fail(`no máximo ${MAX_ITENS} itens por pagamento`);
  return valor.map((bruto) => {
    const item = asObject(bruto);
    if (item.tipo === "PEDIDO") {
      return {
        tipo: "PEDIDO",
        loteId: item.loteId as string,
        quantidade: item.quantidade as number,
        ...(typeof item.codigoAfiliado === "string" && item.codigoAfiliado ? { codigoAfiliado: item.codigoAfiliado } : {}),
      };
    }
    if (item.tipo === "COTA") {
      if (typeof item.compraId !== "string" || item.compraId === "") fail("compraId é obrigatório");
      return { tipo: "COTA", compraId: item.compraId, ...(item.todos === true ? { todos: true } : {}) };
    }
    return fail("cada item precisa de tipo PEDIDO ou COTA");
  });
}

// Pagamento do checkout. Calcula o valor no servidor, cobra pelo provedor (Pix ou cartão) e, quando
// o provedor confirma, emite os ingressos reaproveitando as regras de pedido e de compra em grupo.
export class PaymentService {
  constructor(
    private paymentModel: PaymentModel = new PaymentModel(),
    private provider: PaymentProvider = createPaymentProvider(),
    private orderService: OrderService = new OrderService(),
    private groupPurchaseService: GroupPurchaseService = new GroupPurchaseService(),
    private groupPurchaseModel: GroupPurchaseModel = new GroupPurchaseModel(),
  ) {}

  async create(body: unknown, actor: AuthUser) {
    const dados = asObject(body);
    if (dados.metodo !== "PIX" && dados.metodo !== "CARTAO") fail("metodo deve ser PIX ou CARTAO");
    const metodo = dados.metodo as PaymentMethod;
    const itens = parseItens(dados.itens);

    // O valor vem sempre do banco: cada item é validado e calculado como se fosse pago agora.
    let valorCents = 0;
    for (const item of itens) {
      if (item.tipo === "PEDIDO") {
        valorCents += (await this.orderService.plan({ loteId: item.loteId, quantidade: item.quantidade, codigoAfiliado: item.codigoAfiliado }, actor)).valorCents;
      } else {
        valorCents += (await this.groupPurchaseService.planPay(item.compraId, actor, { todos: item.todos })).valorCents;
      }
    }
    if (valorCents <= 0) fail("O valor do pagamento deve ser maior que zero");

    const email = await this.paymentModel.userEmail(actor.id);
    if (!email) throw new AppError("Usuário não encontrado", 404);

    const expiraEm = new Date(Date.now() + VALIDADE_MIN * 60_000);
    let pagamento = await this.paymentModel.create({
      usuarioId: actor.id,
      metodo,
      provedor: this.provider.nome,
      valor: fromCents(valorCents).toString(),
      itens: itens as unknown as object,
      expiraEm,
    });

    const cobranca = await this.provider.criar({ id: pagamento.id, metodo, valor: valorCents / 100, email, expiraEm });
    pagamento = await this.paymentModel.saveCharge(pagamento.id, cobranca);
    if (cobranca.aprovadoNaHora) await this.settle(pagamento);

    return this.view((await this.paymentModel.findById(pagamento.id)) as Pagamento);
  }

  // O app consulta enquanto espera: se o webhook ainda não chegou, perguntamos ao provedor.
  async find(id: string, actor: AuthUser) {
    let pagamento = await this.paymentModel.findById(id);
    if (!pagamento || pagamento.usuarioId !== actor.id) throw new AppError("Pagamento não encontrado", 404);

    if (pagamento.status === "PENDENTE") {
      if (pagamento.expiraEm <= new Date()) {
        await this.paymentModel.transition(id, ["PENDENTE"], "EXPIRADO");
      } else {
        await this.reconcile(pagamento);
      }
      pagamento = (await this.paymentModel.findById(id)) as Pagamento;
    }
    return this.view(pagamento);
  }

  // Aviso do provedor (webhook). Sempre confere no provedor antes de aprovar.
  async handleNotification(externoId: string): Promise<void> {
    const estado = await this.provider.consultarNotificacao(externoId);
    if (!estado) return;
    const pagamento = await this.paymentModel.findById(estado.pagamentoId);
    if (pagamento) await this.apply(pagamento, estado);
  }

  private async reconcile(pagamento: Pagamento): Promise<void> {
    await this.apply(pagamento, await this.provider.consultar(pagamento.id, pagamento.metodo));
  }

  private async apply(pagamento: Pagamento, estado: { status: "APROVADO" | "RECUSADO" | "PENDENTE"; valor?: number }): Promise<void> {
    if (estado.status === "APROVADO") {
      // Um Pix pago depois do prazo ainda vale: o dinheiro entrou.
      if (estado.valor !== undefined && Math.abs(estado.valor - Number(pagamento.valor)) > 0.01) {
        console.error(`Pagamento ${pagamento.id}: valor pago ${estado.valor} difere do esperado ${pagamento.valor}`);
        return;
      }
      await this.settle(pagamento);
    } else if (estado.status === "RECUSADO") {
      await this.paymentModel.transition(pagamento.id, ["PENDENTE"], "RECUSADO");
    }
  }

  // Marca como aprovado (uma única vez) e emite os ingressos, como o próprio comprador.
  private async settle(pagamento: Pagamento): Promise<void> {
    if (!(await this.paymentModel.transition(pagamento.id, ["PENDENTE", "EXPIRADO"], "APROVADO"))) return;

    const ator: AuthUser = { id: pagamento.usuarioId, papel: "CLIENTE" };
    const resultado: Resultado = { pedidoIds: [], compraIds: [] };
    const erros: string[] = [];
    for (const item of pagamento.itens as unknown as PaymentItem[]) {
      try {
        if (item.tipo === "PEDIDO") {
          const pedido = await this.orderService.create(
            { loteId: item.loteId, quantidade: item.quantidade, codigoAfiliado: item.codigoAfiliado },
            ator,
          );
          resultado.pedidoIds.push(pedido.id);
        } else {
          const compra = await this.groupPurchaseService.pay(item.compraId, ator, { todos: item.todos });
          resultado.compraIds.push(compra.id);
        }
      } catch (error) {
        erros.push(error instanceof AppError ? error.message : "erro inesperado ao emitir");
        if (!(error instanceof AppError)) console.error(`Pagamento ${pagamento.id}: falha ao emitir`, error);
      }
    }
    if (erros.length > 0) console.error(`Pagamento ${pagamento.id} aprovado, mas com itens não emitidos: ${erros.join("; ")}`);
    await this.paymentModel.saveResult(pagamento.id, resultado, erros.length ? erros.join("; ") : null);
  }

  private async view(pagamento: Pagamento) {
    const resultado = (pagamento.resultado ?? { pedidoIds: [], compraIds: [] }) as Resultado;
    const aprovado = pagamento.status === "APROVADO";
    const compras = aprovado
      ? (await Promise.all(resultado.compraIds.map((id) => this.groupPurchaseModel.findById(id)))).filter((c) => c !== null)
      : [];
    return {
      id: pagamento.id,
      status: pagamento.status,
      metodo: pagamento.metodo,
      provedor: pagamento.provedor,
      valor: pagamento.valor.toString(),
      expiraEm: pagamento.expiraEm,
      pixCopiaECola: pagamento.pixCopiaECola,
      pixQrCodeBase64: pagamento.pixQrCodeBase64,
      checkoutUrl: pagamento.checkoutUrl,
      erroEmissao: pagamento.erroEmissao,
      pedidos: aprovado && resultado.pedidoIds.length ? await this.paymentModel.findOrders(resultado.pedidoIds) : [],
      compras,
    };
  }
}

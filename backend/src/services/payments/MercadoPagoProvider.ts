import { AppError } from "../../utils/AppError";
import type { ChargeRequest, ChargeResult, ChargeStatus, PaymentMethod, PaymentProvider } from "./PaymentProvider";

const API = "https://api.mercadopago.com";

type MpPayment = {
  id: number;
  status: string;
  transaction_amount?: number;
  external_reference?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
};

export type MercadoPagoConfig = {
  accessToken: string;
  // URL pública da API (Render): onde o Mercado Pago avisa e para onde o checkout volta.
  publicUrl: string;
  fetchFn?: typeof fetch;
};

// Pix pela API de pagamentos e cartão pelo Checkout Pro (página do Mercado Pago, sem dados de
// cartão no app nem na API). Com credenciais TEST- tudo acontece no ambiente de testes deles.
export class MercadoPagoProvider implements PaymentProvider {
  readonly nome = "MERCADOPAGO";
  private fetchFn: typeof fetch;

  constructor(private config: MercadoPagoConfig) {
    this.fetchFn = config.fetchFn ?? fetch;
  }

  private async chamar<T>(caminho: string, init: { method?: string; body?: unknown; idempotencia?: string } = {}): Promise<T> {
    const res = await this.fetchFn(`${API}${caminho}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
        ...(init.idempotencia ? { "X-Idempotency-Key": init.idempotencia } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });
    if (!res.ok) {
      console.error(`Mercado Pago ${init.method ?? "GET"} ${caminho} -> ${res.status}: ${await res.text().catch(() => "")}`);
      throw new AppError("Não foi possível falar com o Mercado Pago. Tente de novo.", 502);
    }
    return (await res.json()) as T;
  }

  async criar(c: ChargeRequest): Promise<ChargeResult> {
    const notification_url = `${this.config.publicUrl}/pagamentos/webhook/mercadopago`;
    if (c.metodo === "PIX") {
      const p = await this.chamar<MpPayment>("/v1/payments", {
        method: "POST",
        idempotencia: c.id,
        body: {
          transaction_amount: c.valor,
          description: "Ingressos Groov",
          payment_method_id: "pix",
          payer: { email: c.email },
          external_reference: c.id,
          notification_url,
          date_of_expiration: c.expiraEm.toISOString().replace("Z", "+00:00"),
        },
      });
      const dados = p.point_of_interaction?.transaction_data;
      if (!dados?.qr_code) throw new AppError("O Mercado Pago não devolveu o código Pix.", 502);
      return { externoId: String(p.id), pixCopiaECola: dados.qr_code, pixQrCodeBase64: dados.qr_code_base64 };
    }

    const retorno = (status: string) => `${this.config.publicUrl}/pagamentos/retorno?status=${status}`;
    const pref = await this.chamar<{ id: string; init_point: string; sandbox_init_point?: string }>("/checkout/preferences", {
      method: "POST",
      body: {
        items: [{ title: "Ingressos Groov", quantity: 1, unit_price: c.valor, currency_id: "BRL" }],
        payer: { email: c.email },
        external_reference: c.id,
        notification_url,
        back_urls: { success: retorno("approved"), pending: retorno("pending"), failure: retorno("failure") },
        auto_return: "approved",
        // Só cartão: Pix tem tela própria no app, e boleto/lotérica demoram dias.
        payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }, { id: "bank_transfer" }] },
        expires: true,
        expiration_date_to: c.expiraEm.toISOString(),
      },
    });
    const teste = this.config.accessToken.startsWith("TEST-");
    return { externoId: pref.id, checkoutUrl: (teste && pref.sandbox_init_point) || pref.init_point };
  }

  private estado(pagamentos: MpPayment[], metodo: PaymentMethod): ChargeStatus {
    const aprovado = pagamentos.find((p) => p.status === "approved");
    if (aprovado) return { status: "APROVADO", valor: aprovado.transaction_amount };
    // Pix recusado ou cancelado não tem segunda chance; no cartão o cliente pode tentar de novo no checkout.
    const recusado = metodo === "PIX" && pagamentos.length > 0 && pagamentos.every((p) => p.status === "rejected" || p.status === "cancelled");
    return { status: recusado ? "RECUSADO" : "PENDENTE" };
  }

  async consultar(pagamentoId: string, metodo: PaymentMethod): Promise<ChargeStatus> {
    const r = await this.chamar<{ results?: MpPayment[] }>(
      `/v1/payments/search?external_reference=${encodeURIComponent(pagamentoId)}&sort=date_created&criteria=desc`,
    );
    return this.estado(r.results ?? [], metodo);
  }

  async consultarNotificacao(externoId: string): Promise<(ChargeStatus & { pagamentoId: string }) | null> {
    const p = await this.chamar<MpPayment>(`/v1/payments/${encodeURIComponent(externoId)}`);
    if (!p.external_reference) return null;
    // Só o que o provedor confirma conta: a notificação em si é apenas um aviso para consultar.
    return { pagamentoId: p.external_reference, ...this.estado([p], "CARTAO") };
  }
}

import type { ChargeRequest, ChargeResult, ChargeStatus, PaymentProvider } from "./PaymentProvider";

// Sem credenciais do Mercado Pago (desenvolvimento, testes, preview): aprova na hora, sem cobrar.
export class SimulatedProvider implements PaymentProvider {
  readonly nome = "SIMULADO";

  async criar(_cobranca: ChargeRequest): Promise<ChargeResult> {
    return { aprovadoNaHora: true };
  }

  async consultar(): Promise<ChargeStatus> {
    return { status: "APROVADO" };
  }

  async consultarNotificacao(): Promise<null> {
    return null;
  }
}

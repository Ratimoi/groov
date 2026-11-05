export type PaymentMethod = "PIX" | "CARTAO";

// O que o provedor precisa saber de um pagamento para cobrá-lo.
export type ChargeRequest = {
  id: string;
  metodo: PaymentMethod;
  valor: number;
  email: string;
  expiraEm: Date;
};

// O que o provedor devolve ao criar a cobrança: o app mostra o Pix ou abre o checkout.
export type ChargeResult = {
  externoId?: string;
  pixCopiaECola?: string;
  pixQrCodeBase64?: string;
  checkoutUrl?: string;
  // Provedor simulado: a cobrança já nasce aprovada.
  aprovadoNaHora?: boolean;
};

export type ChargeStatus = { status: "APROVADO" | "RECUSADO" | "PENDENTE"; valor?: number };

export interface PaymentProvider {
  readonly nome: string;
  criar(cobranca: ChargeRequest): Promise<ChargeResult>;
  // Consulta o provedor pelo pagamento (external_reference = id do nosso Pagamento).
  consultar(pagamentoId: string, metodo: PaymentMethod): Promise<ChargeStatus>;
  // Resolve uma notificação (webhook) para o id do nosso Pagamento e o estado dele.
  consultarNotificacao(externoId: string): Promise<(ChargeStatus & { pagamentoId: string }) | null>;
}

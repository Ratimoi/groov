import { MercadoPagoProvider } from "./MercadoPagoProvider";
import type { PaymentProvider } from "./PaymentProvider";
import { SimulatedProvider } from "./SimulatedProvider";

// Com MERCADOPAGO_ACCESS_TOKEN a cobrança é real (ou de teste, se a credencial for TEST-);
// sem ele o pagamento é simulado.
export function paymentsEnabled(): boolean {
  return !!process.env.MERCADOPAGO_ACCESS_TOKEN;
}

export function createPaymentProvider(): PaymentProvider {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return new SimulatedProvider();
  const publicUrl = process.env.PUBLIC_API_URL;
  if (!publicUrl) throw new Error("PUBLIC_API_URL é obrigatório quando MERCADOPAGO_ACCESS_TOKEN está definido");
  return new MercadoPagoProvider({ accessToken, publicUrl: publicUrl.replace(/\/$/, "") });
}

export type { PaymentProvider } from "./PaymentProvider";

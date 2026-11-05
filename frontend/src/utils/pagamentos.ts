import { Linking } from "react-native";
import type { CompraGrupoApi, PedidoApi } from "./compras";

export type MetodoPagamento = "PIX" | "CARTAO";

export type StatusPagamento = "PENDENTE" | "APROVADO" | "RECUSADO" | "EXPIRADO";

// Resposta de POST /pagamentos e GET /pagamentos/:id.
export type PagamentoApi = {
  id: string;
  status: StatusPagamento;
  metodo: MetodoPagamento;
  provedor: "SIMULADO" | "MERCADOPAGO";
  valor: string;
  expiraEm: string;
  pixCopiaECola: string | null;
  pixQrCodeBase64: string | null;
  checkoutUrl: string | null;
  erroEmissao: string | null;
  pedidos: PedidoApi[];
  compras: CompraGrupoApi[];
};

export const NOME_METODO: Record<MetodoPagamento, string> = { PIX: "Pix", CARTAO: "Cartão" };

// O que fazer no carrinho quando o pagamento em andamento for aprovado. Fica fora do React para
// sobreviver à ida ao navegador do cartão e à volta pelo link do app.
export type PagamentoEmAndamento = { id: string; lotesDoCarrinho: string[]; nomeGrupo?: string };
let emAndamento: PagamentoEmAndamento | null = null;
export const definirEmAndamento = (valor: PagamentoEmAndamento | null) => {
  emAndamento = valor;
};
export const obterEmAndamento = () => emAndamento;

// A área de transferência é um módulo nativo: um APK antigo cairia no compartilhamento comum.
let Clipboard: typeof import("expo-clipboard") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Clipboard = require("expo-clipboard");
} catch {
  Clipboard = null;
}
export async function copiar(texto: string): Promise<boolean> {
  if (!Clipboard) return false;
  await Clipboard.setStringAsync(texto);
  return true;
}

// Abre o checkout do cartão numa aba do navegador dentro do app; sem o módulo, no navegador do aparelho.
let WebBrowser: typeof import("expo-web-browser") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebBrowser = require("expo-web-browser");
} catch {
  WebBrowser = null;
}
export async function abrirCheckout(url: string): Promise<void> {
  if (WebBrowser) await WebBrowser.openBrowserAsync(url);
  else await Linking.openURL(url);
}

import type { EventoType } from "./EventoType";
import type { LoteType } from "./LoteType";
import type { PedidoType } from "./PedidoType";
import type { UsuarioType } from "./UsuarioType";
import type { ValidacaoIngressoType } from "./ValidacaoIngressoType";

export type IngressoType = {
  id: string;
  codigoQr: string;
  status: "VALIDO" | "USADO" | "CANCELADO";
  eventoId: string;
  evento: EventoType;
  loteId: string;
  lote: LoteType;
  pedidoId: string;
  pedido: PedidoType;
  donoId: string;
  dono: UsuarioType;
  emitidoEm: Date;
  usadoEm?: Date | null;
  validacoes: ValidacaoIngressoType[];
};

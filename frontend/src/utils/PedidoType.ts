import type { UsuarioType } from "./UsuarioType";
import type { EventoType } from "./EventoType";
import type { LoteType } from "./LoteType";
import type { IngressoType } from "./IngressoType";
import type { ParticipanteCompraType } from "./ParticipanteCompraType";

export type PedidoType = {
  id: string;
  usuarioId: string;
  usuario: UsuarioType;
  eventoId: string;
  evento: EventoType;
  loteId: string;
  lote: LoteType;
  quantidade: number;
  status: "PENDENTE" | "PAGO" | "CANCELADO";
  subtotal: string;
  desconto: string;
  taxaServico: string;
  valor: string;
  criadoEm: Date;
  pagoEm?: Date | null;
  ingressos: IngressoType[];
  participanteCompra?: ParticipanteCompraType | null;
};

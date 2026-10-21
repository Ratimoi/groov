import type { EventoType } from "./EventoType";
import type { PedidoType } from "./PedidoType";
import type { IngressoType } from "./IngressoType";
import type { CompraGrupoType } from "./CompraGrupoType";

export type LoteType = {
  id: string;
  eventoId: string;
  evento: EventoType;
  nome: string;
  preco: string;
  quantidade: number;
  quantidadeVendida: number;
  criadoEm: Date;
  tamanhoGrupo?: number | null;
  descontoGrupo?: string | null;
  prazoGrupoHoras?: number | null;
  quantidadeReservada: number;
  pedidos: PedidoType[];
  ingressos: IngressoType[];
  comprasGrupo: CompraGrupoType[];
};

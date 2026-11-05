import type { PedidoType } from "./PedidoType";
import type { IngressoType } from "./IngressoType";
import type { ValidacaoIngressoType } from "./ValidacaoIngressoType";
import type { EventoType } from "./EventoType";
import type { GrupoType } from "./GrupoType";
import type { MembroGrupoType } from "./MembroGrupoType";
import type { CompraGrupoType } from "./CompraGrupoType";
import type { ParticipanteCompraType } from "./ParticipanteCompraType";

export type UsuarioType = {
  id: string;
  nome: string;
  username: string;
  avatarUrl?: string | null;
  email: string;
  senha: string;
  papel: "CLIENTE" | "PRODUTOR" | "ADMIN";
  criadoEm: Date;
  pedidos: PedidoType[];
  ingressos: IngressoType[];
  validacoes: ValidacaoIngressoType[];
  eventosCriados: EventoType[];
  gruposLiderados: GrupoType[];
  participacoes: MembroGrupoType[];
  comprasIniciadas: CompraGrupoType[];
  participacoesCompra: ParticipanteCompraType[];
};

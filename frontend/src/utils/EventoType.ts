import type { CategoriaType } from "./CategoriaType";
import type { UsuarioType } from "./UsuarioType";
import type { LoteType } from "./LoteType";
import type { PedidoType } from "./PedidoType";
import type { IngressoType } from "./IngressoType";
import type { ValidacaoIngressoType } from "./ValidacaoIngressoType";

export type EventoType = {
  id: string;
  titulo: string;
  descricao?: string | null;
  imagemUrl?: string | null;
  comecaEm: Date;
  terminaEm?: Date | null;
  nomeLocal?: string | null;
  cidade: string;
  categoriaId?: string | null;
  categoria?: CategoriaType | null;
  criadoPorId?: string | null;
  criadoPor?: UsuarioType | null;
  criadoEm: Date;
  atualizadoEm: Date;
  lotes: LoteType[];
  pedidos: PedidoType[];
  ingressos: IngressoType[];
  validacoes: ValidacaoIngressoType[];
};

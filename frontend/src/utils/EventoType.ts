import type { CategoriaType } from "./CategoriaType";
import type { UsuarioType } from "./UsuarioType";
import type { LoteType } from "./LoteType";
import type { PedidoType } from "./PedidoType";
import type { IngressoType } from "./IngressoType";
import type { ValidacaoIngressoType } from "./ValidacaoIngressoType";

// Atração do evento: nome livre, foto opcional e a conta marcada, se houver.
export type AtracaoType = {
  id: string;
  nome: string;
  fotoUrl?: string | null;
  usuario?: { id: string; nome: string; username: string; avatarUrl?: string | null } | null;
};

export type EventoType = {
  id: string;
  titulo: string;
  descricao?: string | null;
  imagemUrl?: string | null;
  comecaEm: Date;
  terminaEm?: Date | null;
  horario: Date;
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
  destaque: boolean;
  atracoes: AtracaoType[];
  endereco?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tags?: string[];
};

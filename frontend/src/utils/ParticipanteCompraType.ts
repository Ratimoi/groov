import type { CompraGrupoType } from "./CompraGrupoType";
import type { UsuarioType } from "./UsuarioType";
import type { PedidoType } from "./PedidoType";

export type ParticipanteCompraType = {
  id: string;
  compraGrupoId: string;
  compraGrupo: CompraGrupoType;
  usuarioId: string;
  usuario: UsuarioType;
  pedidoId?: string | null;
  pedido?: PedidoType | null;
  status: "PENDENTE" | "PAGO" | "REEMBOLSADO";
};

import type { GrupoType } from "./GrupoType";
import type { LoteType } from "./LoteType";
import type { UsuarioType } from "./UsuarioType";
import type { ParticipanteCompraType } from "./ParticipanteCompraType";

export type CompraGrupoType = {
  id: string;
  grupoId: string;
  grupo: GrupoType;
  loteId: string;
  lote: LoteType;
  iniciadorId: string;
  iniciador: UsuarioType;
  status: "PENDENTE" | "CONFIRMADA" | "EXPIRADA";
  expiraEm: Date;
  criadoEm: Date;
  participantes: ParticipanteCompraType[];
};

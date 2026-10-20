import type { UsuarioType } from "./UsuarioType";
import type { MembroGrupoType } from "./MembroGrupoType";
import type { CompraGrupoType } from "./CompraGrupoType";

export type GrupoType = {
  id: string;
  nome: string;
  liderId: string;
  lider: UsuarioType;
  criadoEm: Date;
  membros: MembroGrupoType[];
  compras: CompraGrupoType[];
};

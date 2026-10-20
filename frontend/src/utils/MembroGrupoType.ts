import type { GrupoType } from "./GrupoType";
import type { UsuarioType } from "./UsuarioType";

export type MembroGrupoType = {
  id: string;
  grupoId: string;
  grupo: GrupoType;
  usuarioId: string;
  usuario: UsuarioType;
  entrouEm: Date;
};

import type { IngressoType } from "./IngressoType";
import type { EventoType } from "./EventoType";
import type { UsuarioType } from "./UsuarioType";

export type ValidacaoIngressoType = {
  id: string;
  codigoLido: string;
  ingressoId?: string | null;
  ingresso?: IngressoType | null;
  eventoId: string;
  evento: EventoType;
  validadoPorId: string;
  validadoPor: UsuarioType;
  resultado: "VALIDO" | "JA_UTILIZADO" | "INVALIDO";
  criadoEm: Date;
};

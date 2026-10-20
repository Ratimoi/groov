import type { AuthUser } from "./auth";

// Lote como a API o devolve: valores monetários em texto com casas fixas e a disponibilidade já calculada.
export type LotDto = {
  id: string;
  eventoId: string;
  nome: string;
  preco: string;
  quantidade: number;
  quantidadeVendida: number;
  quantidadeReservada: number;
  quantidadeDisponivel: number;
  tamanhoGrupo: number | null;
  descontoGrupo: string | null;
  prazoGrupoHoras: number | null;
  criadoEm: Date;
};

// `body` é o corpo bruto da requisição: o service valida e escolhe os campos permitidos.
export interface LotServiceContract {
  findByEvent(eventoId: string): Promise<LotDto[]>;
  findById(id: string): Promise<LotDto | null>;
  create(eventoId: string, body: unknown, actor: AuthUser): Promise<LotDto>;
  update(id: string, body: unknown, actor: AuthUser): Promise<LotDto | null>;
  delete(id: string, actor: AuthUser): Promise<boolean>;
}

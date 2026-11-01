// Formatos devolvidos pela API nas compras (veja docs/API.md).

export type PessoaApi = { id: string; nome: string; username: string; avatarUrl: string | null };

export type EventoResumoApi = {
  id: string;
  titulo: string;
  imagemUrl: string | null;
  comecaEm: string;
  terminaEm?: string | null;
  nomeLocal: string | null;
  cidade?: string;
};

export type PedidoApi = {
  id: string;
  quantidade: number;
  subtotal: string;
  desconto: string;
  taxaServico: string;
  valor: string;
  pagoEm: string | null;
  evento: EventoResumoApi;
  lote: { id: string; nome: string };
  ingressos: { id: string; codigoQr: string; status: string }[];
};

export type ParticipanteApi = {
  id: string;
  usuarioId: string;
  pedidoId: string | null;
  status: "PENDENTE" | "PAGO" | "REEMBOLSADO";
  usuario: PessoaApi;
};

export type CompraGrupoApi = {
  id: string;
  grupoId: string;
  iniciadorId: string;
  status: "PENDENTE" | "CONFIRMADA" | "EXPIRADA";
  expiraEm: string;
  participantes: ParticipanteApi[];
  lote: {
    id: string;
    nome: string;
    preco: string;
    descontoGrupo: string | null;
    tamanhoGrupo: number | null;
    evento: Omit<EventoResumoApi, "terminaEm" | "cidade"> & { categoria: { nome: string } | null };
  };
};

export type IngressoApi = {
  id: string;
  codigoQr: string;
  status: "VALIDO" | "USADO" | "CANCELADO";
  emitidoEm: string;
  evento: EventoResumoApi;
  lote: { id: string; nome: string };
  dono: { id: string; nome: string; username: string };
};

// Resposta de POST /ingressos/validar (200, 404 e 409 trazem o mesmo formato).
export type ValidacaoApi = {
  resultado: "VALIDO" | "JA_UTILIZADO" | "INVALIDO";
  mensagem: string;
  ingresso: IngressoApi | null;
};

// O que a tela "Pagamento Confirmado" mostra: o que acabou de ser pago.
export type ResultadoCompra = {
  pedidos: PedidoApi[];
  compraGrupo?: CompraGrupoApi;
  nomeGrupo?: string;
};

// "GRV-ABCDEFGHJKLM" -> "GRV-ABCD-EFGH-JKLM"
export function formatarCodigo(codigo: string): string {
  const corpo = codigo.replace(/^GRV-/, "");
  return `GRV-${corpo.match(/.{1,4}/g)?.join("-") ?? corpo}`;
}

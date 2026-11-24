// Função de uma pessoa em um evento. Não existe administrador geral: tudo vem daqui.
export type FuncaoEvento = "DONO" | "PRODUTOR" | "PORTEIRO";

export const ROTULO_FUNCAO: Record<FuncaoEvento, string> = {
  DONO: "Dono",
  PRODUTOR: "Produtor",
  PORTEIRO: "Porteiro",
};

export type EventoDaEquipeApi = {
  funcao: FuncaoEvento;
  evento: {
    id: string;
    titulo: string;
    imagemUrl: string | null;
    comecaEm: string;
    terminaEm: string | null;
    cidade: string;
  };
};

export type MembroEquipeApi = {
  usuarioId: string;
  funcao: FuncaoEvento;
  usuario: { id: string; nome: string; username: string; avatarUrl: string | null };
};

export type DashboardApi = {
  evento: { id: string; titulo: string; comecaEm: string; terminaEm: string | null };
  funcao: FuncaoEvento;
  ingressos: { emitidos: number; aguardando: number; entraram: number; cancelados: number };
  tentativas: { liberadas: number; jaUtilizados: number; invalidas: number };
  entradasPorHora: { hora: string; total: number }[];
  ultimasEntradas: { ingressoId: string; dono: string; lote: string; usadoEm: string }[];
  lotes: {
    id: string;
    nome: string;
    quantidade: number;
    vendidos: number;
    reservados: number;
    disponiveis: number;
    preco?: string;
  }[];
  // Só dono e produtor recebem dinheiro; o porteiro vê apenas as entradas.
  receita?: string;
};

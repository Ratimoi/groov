// Mesma taxa que o backend vai cobrar no pedido (etapa de pagamento); fica num lugar só.
export const TAXA_SERVICO = 0.125;

export type LoteVenda = {
  id: string;
  nome: string;
  preco: string | number;
  quantidade: number;
  quantidadeDisponivel?: number;
  tamanhoGrupo?: number | null;
  descontoGrupo?: string | number | null;
  prazoGrupoHoras?: number | null;
};

export type GrupoEscolhido = { id: string; nome: string };

export type LinhaPedido = { chave: string; descricao: string; valor: number };

export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function formatarReais(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export function aceitaGrupo(lote: LoteVenda): boolean {
  return lote.tamanhoGrupo != null && lote.prazoGrupoHoras != null;
}

export function disponiveis(lote: LoteVenda): number {
  return Math.max(0, lote.quantidadeDisponivel ?? lote.quantidade);
}

// Preço de cada ingresso quando a compra é em grupo.
export function precoNoGrupo(lote: LoteVenda): number {
  return arredondar(Number(lote.preco) * (1 - Number(lote.descontoGrupo ?? 0)));
}

export function resumoGrupo(lote: LoteVenda) {
  const tamanho = lote.tamanhoGrupo ?? 1;
  const unitario = precoNoGrupo(lote);
  const totalCheio = arredondar(Number(lote.preco) * tamanho);
  const total = arredondar(unitario * tamanho);
  return { tamanho, unitario, total, totalCheio, economia: arredondar(totalCheio - total) };
}

// Monta o resumo do pedido: quem paga individual leva `quantidade` ingressos;
// quem escolheu o pacote de grupo paga a própria cota pelo preço com desconto.
export function calcularPedido(
  lotes: LoteVenda[],
  quantidades: Record<string, number>,
  gruposPorLote: Record<string, GrupoEscolhido | undefined>,
) {
  const linhas: LinhaPedido[] = [];

  for (const lote of lotes) {
    const quantidade = quantidades[lote.id] ?? 0;
    if (quantidade > 0) {
      linhas.push({
        chave: `individual-${lote.id}`,
        descricao: `${quantidade}x ${lote.nome}`,
        valor: arredondar(Number(lote.preco) * quantidade),
      });
    }

    const grupo = gruposPorLote[lote.id];
    if (grupo && aceitaGrupo(lote)) {
      linhas.push({
        chave: `grupo-${lote.id}`,
        descricao: `1x ${lote.nome} (grupo ${grupo.nome})`,
        valor: precoNoGrupo(lote),
      });
    }
  }

  const subtotal = arredondar(linhas.reduce((soma, linha) => soma + linha.valor, 0));
  const taxa = arredondar(subtotal * TAXA_SERVICO);
  return { linhas, subtotal, taxa, total: arredondar(subtotal + taxa) };
}

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

export type LinhaPedido = { chave: string; descricao: string; valor: number; desconto?: boolean };

export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function formatarReais(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export function formatarDesconto(valor: number): string {
  return `- ${formatarReais(Math.abs(valor))}`;
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
      const preco = arredondar(Number(lote.preco));
      linhas.push(
        { chave: `grupo-${lote.id}`, descricao: `${lote.nome} · Pacote de grupo`, valor: preco },
        {
          chave: `desconto-${lote.id}`,
          descricao: `Desconto de grupo (${Math.round(Number(lote.descontoGrupo ?? 0) * 100)}%)`,
          valor: arredondar(precoNoGrupo(lote) - preco),
          desconto: true,
        },
      );
    }
  }

  const subtotal = arredondar(linhas.reduce((soma, linha) => soma + linha.valor, 0));
  const taxa = arredondar(subtotal * TAXA_SERVICO);
  return { linhas, subtotal, taxa, total: arredondar(subtotal + taxa) };
}

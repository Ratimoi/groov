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

// Desconto aplicado no pacote de grupo: o maior entre o do grupo e o do código de promotor (não somam).
export function descontoDoGrupo(lote: LoteVenda, descontoAfiliado = 0): number {
  return Math.max(Number(lote.descontoGrupo ?? 0), descontoAfiliado);
}

// Preço de cada ingresso quando a compra é em grupo.
export function precoNoGrupo(lote: LoteVenda, descontoAfiliado = 0): number {
  return arredondar(Number(lote.preco) * (1 - descontoDoGrupo(lote, descontoAfiliado)));
}

export function resumoGrupo(lote: LoteVenda) {
  const tamanho = lote.tamanhoGrupo ?? 1;
  const unitario = precoNoGrupo(lote);
  const totalCheio = arredondar(Number(lote.preco) * tamanho);
  const total = arredondar(unitario * tamanho);
  return { tamanho, unitario, total, totalCheio, economia: arredondar(totalCheio - total) };
}

// Quanto o pacote de grupo custa conforme quem paga: só a cota de quem compra ou a de todo o grupo.
export type CoberturaGrupo = "meu" | "todos";

export function totalDoGrupo(lote: LoteVenda, cobertura: CoberturaGrupo, descontoAfiliado = 0) {
  const pessoas = cobertura === "todos" ? (lote.tamanhoGrupo ?? 1) : 1;
  const cheio = arredondar(Number(lote.preco) * pessoas);
  const liquido = arredondar(precoNoGrupo(lote, descontoAfiliado) * pessoas);
  const taxa = arredondar(liquido * TAXA_SERVICO);
  return { pessoas, cheio, liquido, taxa, total: arredondar(liquido + taxa) };
}

// Monta o resumo do pedido: quem paga individual leva `quantidade` ingressos; quem escolheu o
// pacote de grupo paga a própria cota pelo preço com desconto, ou a de todo o grupo quando a
// cobertura do lote é "todos".
export function calcularPedido(
  lotes: LoteVenda[],
  quantidades: Record<string, number>,
  gruposPorLote: Record<string, GrupoEscolhido | undefined>,
  coberturas: Record<string, CoberturaGrupo | undefined> = {},
  descontoAfiliado = 0,
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
      if (descontoAfiliado > 0) {
        linhas.push({
          chave: `afiliado-${lote.id}`,
          descricao: `Desconto do promotor (${Math.round(descontoAfiliado * 100)}%)`,
          valor: -arredondar(Number(lote.preco) * quantidade * descontoAfiliado),
          desconto: true,
        });
      }
    }

    const grupo = gruposPorLote[lote.id];
    if (grupo && aceitaGrupo(lote)) {
      const { pessoas, cheio, liquido } = totalDoGrupo(lote, coberturas[lote.id] ?? "meu", descontoAfiliado);
      const doPromotor = descontoAfiliado > Number(lote.descontoGrupo ?? 0);
      linhas.push(
        {
          chave: `grupo-${lote.id}`,
          descricao: pessoas > 1 ? `${pessoas}x ${lote.nome} · Pacote de grupo` : `${lote.nome} · Pacote de grupo`,
          valor: cheio,
        },
        {
          chave: `desconto-${lote.id}`,
          descricao: `${doPromotor ? "Desconto do promotor" : "Desconto de grupo"} (${Math.round(descontoDoGrupo(lote, descontoAfiliado) * 100)}%)`,
          valor: arredondar(liquido - cheio),
          desconto: true,
        },
      );
    }
  }

  const subtotal = arredondar(linhas.reduce((soma, linha) => soma + linha.valor, 0));
  const taxa = arredondar(subtotal * TAXA_SERVICO);
  return { linhas, subtotal, taxa, total: arredondar(subtotal + taxa) };
}

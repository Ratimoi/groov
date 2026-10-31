import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type LoteComPreco = { preco: string | number; quantidade?: number };

// `preco` chega como string ("180" nos lotes embutidos, "180.00" nas rotas de lotes).
export function menorPreco(lotes?: LoteComPreco[] | null): number | null {
  const precos = (lotes ?? []).map((lote) => Number(lote.preco)).filter((preco) => !Number.isNaN(preco));
  return precos.length ? Math.min(...precos) : null;
}

export function formatarPreco(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return "";
  const numero = Number(valor);
  const texto = Number.isInteger(numero) ? String(numero) : numero.toFixed(2).replace(".", ",");
  return `R$ ${texto}`;
}

// `comecaEm` e `terminaEm` já carregam data e hora; `horario` é um TIME em UTC e
// aparece deslocado no fuso do aparelho, então não é usado para exibir.
export function formatarDataHora(comecaEm?: Date | string | null): string {
  if (!comecaEm) return "";
  return format(new Date(comecaEm), "dd MMM • HH:mm", { locale: ptBR });
}

export function formatarIntervalo(comecaEm?: Date | string | null, terminaEm?: Date | string | null): string {
  if (!comecaEm) return "";
  const inicio = format(new Date(comecaEm), "dd MMM • HH:mm", { locale: ptBR });
  return terminaEm ? `${inicio} - ${format(new Date(terminaEm), "HH:mm")}` : inicio;
}

export function calcularContagem(alvo: Date | string | null | undefined, agora = Date.now()) {
  const restante = alvo ? Math.max(0, new Date(alvo).getTime() - agora) : 0;
  const segundosTotais = Math.floor(restante / 1000);
  return {
    dias: Math.floor(segundosTotais / 86400),
    horas: Math.floor((segundosTotais % 86400) / 3600),
    minutos: Math.floor((segundosTotais % 3600) / 60),
    segundos: segundosTotais % 60,
    encerrado: restante === 0,
  };
}

// "04:15:32": horas somam os dias, para o prazo de uma compra em grupo (até 30 dias).
export function formatarRestante(contagem: ReturnType<typeof calcularContagem>): string {
  const horas = contagem.dias * 24 + contagem.horas;
  return [horas, contagem.minutos, contagem.segundos].map((valor) => String(valor).padStart(2, "0")).join(":");
}

// Taxa de serviço cobrada sobre o valor dos ingressos. O app usa o mesmo percentual para mostrar o resumo.
export const SERVICE_FEE_RATE = 0.125;

// Dinheiro circula em centavos inteiros para não acumular erro de ponto flutuante.
export function toCents(value: { toString(): string } | number | string): number {
  return Math.round(Number(value.toString()) * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function serviceFeeCents(subtotalCents: number): number {
  return Math.round(subtotalCents * SERVICE_FEE_RATE);
}

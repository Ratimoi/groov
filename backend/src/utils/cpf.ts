// CPF é guardado só com os 11 dígitos. Aceita com ou sem máscara (000.000.000-00).
export function normalizeCpf(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const digitos = valor.replace(/[.\-\s]/g, "");
  if (!/^\d{11}$/.test(digitos)) return null;
  if (/^(\d)\1{10}$/.test(digitos)) return null;

  const digitoVerificador = (base: string) => {
    const soma = base.split("").reduce((total, d, i) => total + Number(d) * (base.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const ok = digitoVerificador(digitos.slice(0, 9)) === Number(digitos[9]) && digitoVerificador(digitos.slice(0, 10)) === Number(digitos[10]);
  return ok ? digitos : null;
}

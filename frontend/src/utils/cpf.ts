// Mesma regra do backend (backend/src/utils/cpf.ts): 11 dígitos, não repetidos, com os dois verificadores.
export function cpfValido(valor: string): boolean {
  const digitos = valor.replace(/\D/g, "");
  if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;

  const verificador = (base: string) => {
    const soma = base.split("").reduce((total, d, i) => total + Number(d) * (base.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return verificador(digitos.slice(0, 9)) === Number(digitos[9]) && verificador(digitos.slice(0, 10)) === Number(digitos[10]);
}

// Máscara enquanto digita: 52998224725 -> 529.982.247-25
export function mascararCpf(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

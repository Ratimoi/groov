// Máscaras e leitura de data/hora digitadas à mão (o app não usa seletor de data).

const soDigitos = (texto: string) => texto.replace(/\D/g, "");

// 25122026 -> 25/12/2026
export function mascararData(texto: string): string {
  const d = soDigitos(texto).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// 2030 -> 20:30
export function mascararHora(texto: string): string {
  const d = soDigitos(texto).slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

// Junta "DD/MM/AAAA" e "HH:MM" (horário do aparelho). Devolve null se faltar algo ou a data não existir
// (31/02, 25:00...). Ficar de fora do passado é decisão de quem chama.
export function lerDataHora(data: string, hora: string): Date | null {
  const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  const h = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!d || !h) return null;
  const [dia, mes, ano, horas, minutos] = [d[1], d[2], d[3], h[1], h[2]].map(Number);
  const resultado = new Date(ano, mes - 1, dia, horas, minutos);
  const confere =
    resultado.getFullYear() === ano &&
    resultado.getMonth() === mes - 1 &&
    resultado.getDate() === dia &&
    resultado.getHours() === horas &&
    resultado.getMinutes() === minutos;
  return confere ? resultado : null;
}

// "80", "80,5" ou "80.50" -> "80.50". Null se não for um valor com até 2 casas.
export function lerPreco(texto: string): string | null {
  const limpo = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Number(limpo).toFixed(2);
}

const dois = (n: number) => String(n).padStart(2, "0");

// Inverso de `lerDataHora`: ISO (ou Date) -> "DD/MM/AAAA" e "HH:MM" no horário do aparelho.
export function camposDeDataHora(valor: string | Date | null | undefined): { data: string; hora: string } {
  if (!valor) return { data: "", hora: "" };
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return { data: "", hora: "" };
  return { data: `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`, hora: `${dois(d.getHours())}:${dois(d.getMinutes())}` };
}

import { Prisma } from "@prisma/client";
import { asObject, fail } from "./validation";

export type LotData = {
  nome: string;
  preco: string;
  quantidade: number;
  tamanhoGrupo: number | null;
  descontoGrupo: string | null;
  prazoGrupoHoras: number | null;
};

export type LotCreateData = Partial<LotData> & Pick<LotData, "nome" | "preco" | "quantidade">;
export type LotUpdateData = Partial<LotData>;

const MAX_NOME = 100;
const MAX_PRECO = 99_999_999.99; // Decimal(10, 2)
const MAX_QUANTIDADE = 1_000_000;
const MAX_TAMANHO_GRUPO = 50;
const MAX_PRAZO_HORAS = 24 * 30;

function requiredName(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") fail("nome é obrigatório");
  if (value.trim().length > MAX_NOME) fail(`nome deve ter no máximo ${MAX_NOME} caracteres`);
  return value.trim();
}

function integer(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    fail(`${name} deve ser um inteiro entre ${min} e ${max}`);
  }
  return value;
}

// Aceita número ou texto decimal ("180", "180.5", "180.50"), no máximo `scale` casas, sem notação
// científica. Devolve sempre texto com `scale` casas, que o Prisma grava como Decimal sem erro de ponto flutuante.
function decimal(value: unknown, name: string, scale: number, min: number, max: number): string {
  const text = typeof value === "number" && Number.isFinite(value) ? String(value) : value;
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${scale}})?$`);
  if (typeof text !== "string" || !pattern.test(text)) {
    fail(`${name} deve ser um número com no máximo ${scale} casas decimais`);
  }
  const number = Number(text);
  if (number < min || number > max) fail(`${name} deve estar entre ${min} e ${max}`);
  return new Prisma.Decimal(text).toFixed(scale);
}

function parseFields(body: Record<string, unknown>): LotUpdateData {
  const data: LotUpdateData = {};
  if (body.nome !== undefined) data.nome = requiredName(body.nome);
  if (body.preco !== undefined) data.preco = decimal(body.preco, "preco", 2, 0, MAX_PRECO);
  if (body.quantidade !== undefined) data.quantidade = integer(body.quantidade, "quantidade", 1, MAX_QUANTIDADE);

  // Configuração de compra em grupo: `null` desliga o campo.
  if (body.tamanhoGrupo !== undefined) {
    data.tamanhoGrupo = body.tamanhoGrupo === null ? null : integer(body.tamanhoGrupo, "tamanhoGrupo", 2, MAX_TAMANHO_GRUPO);
  }
  if (body.prazoGrupoHoras !== undefined) {
    data.prazoGrupoHoras =
      body.prazoGrupoHoras === null ? null : integer(body.prazoGrupoHoras, "prazoGrupoHoras", 1, MAX_PRAZO_HORAS);
  }
  if (body.descontoGrupo !== undefined) {
    // Fração: 0.15 = 15% de desconto. Menor que 1 (100% seria de graça).
    const desconto = body.descontoGrupo === null ? null : decimal(body.descontoGrupo, "descontoGrupo", 4, 0, 0.9999);
    data.descontoGrupo = desconto;
  }
  return data;
}

type GroupConfig = {
  tamanhoGrupo?: number | null;
  prazoGrupoHoras?: number | null;
  descontoGrupo?: unknown;
};

// A compra em grupo exige tamanho e prazo juntos, e o desconto só faz sentido com ela ligada.
export function assertGroupConfig({ tamanhoGrupo, prazoGrupoHoras, descontoGrupo }: GroupConfig): void {
  if ((tamanhoGrupo == null) !== (prazoGrupoHoras == null)) {
    fail("tamanhoGrupo e prazoGrupoHoras devem ser informados juntos");
  }
  if (descontoGrupo != null && tamanhoGrupo == null) {
    fail("descontoGrupo exige tamanhoGrupo e prazoGrupoHoras");
  }
}

export function parseLotCreate(body: unknown): LotCreateData {
  const input = asObject(body);
  for (const required of ["nome", "preco", "quantidade"]) {
    if (input[required] === undefined) fail(`${required} é obrigatório`);
  }
  const data = parseFields(input) as LotCreateData;
  assertGroupConfig(data);
  return data;
}

export function parseLotUpdate(body: unknown): LotUpdateData {
  const data = parseFields(asObject(body));
  if (Object.keys(data).length === 0) fail("Nenhum campo para atualizar");
  return data;
}

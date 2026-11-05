// Formulário de publicar evento: máscaras, validação por etapa e montagem do corpo da API.

export type AtracaoForm = { chave: string; nome: string; fotoUrl: string; username: string };

export type LoteForm = {
  chave: string;
  nome: string;
  preco: string;
  quantidade: string;
  grupo: boolean;
  tamanhoGrupo: string;
  descontoPct: string;
  prazoHoras: string;
};

export type EventoForm = {
  titulo: string;
  descricao: string;
  imagemUrl: string;
  data: string;
  hora: string;
  dataFim: string;
  horaFim: string;
  tags: string;
  nomeLocal: string;
  endereco: string;
  cidade: string;
  atracoes: AtracaoForm[];
  lotes: LoteForm[];
};

let contador = 0;
export const novaChave = () => `k${Date.now()}-${contador++}`;

export const novaAtracao = (): AtracaoForm => ({ chave: novaChave(), nome: "", fotoUrl: "", username: "" });

export const novoLote = (nome = ""): LoteForm => ({
  chave: novaChave(),
  nome,
  preco: "",
  quantidade: "",
  grupo: false,
  tamanhoGrupo: "4",
  descontoPct: "10",
  prazoHoras: "24",
});

export const formVazio = (): EventoForm => ({
  titulo: "",
  descricao: "",
  imagemUrl: "",
  data: "",
  hora: "",
  dataFim: "",
  horaFim: "",
  tags: "",
  nomeLocal: "",
  endereco: "",
  cidade: "",
  atracoes: [],
  lotes: [novoLote("1º lote")],
});

const soDigitos = (texto: string) => texto.replace(/\D/g, "");

export function mascararData(texto: string): string {
  const d = soDigitos(texto).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function mascararHora(texto: string): string {
  const d = soDigitos(texto).slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

// "25/12/2026" + "21:30" -> Date no fuso do aparelho; null se não for uma data real.
export function lerDataHora(data: string, hora: string): Date | null {
  const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  const h = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!d || !h) return null;
  const [dia, mes, ano, hh, mm] = [d[1], d[2], d[3], h[1], h[2]].map(Number);
  if (hh > 23 || mm > 59) return null;
  const resultado = new Date(ano, mes - 1, dia, hh, mm);
  const real = resultado.getFullYear() === ano && resultado.getMonth() === mes - 1 && resultado.getDate() === dia;
  return real ? resultado : null;
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

export function paraCamposDataHora(iso?: string | null): { data: string; hora: string } {
  if (!iso) return { data: "", hora: "" };
  const d = new Date(iso);
  return {
    data: `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`,
    hora: `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`,
  };
}

export function lerPreco(texto: string): string | null {
  const limpo = texto.trim().replace(/^R\$\s*/, "").replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(limpo) && Number(limpo) <= 99_999_999.99 ? limpo : null;
}

const urlValida = (texto: string) => /^https?:\/\/\S+$/i.test(texto.trim());

export function listaDeTags(texto: string): string[] {
  const vistas = new Set<string>();
  return texto
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter((t) => {
      const chave = t.toLowerCase();
      if (!t || vistas.has(chave)) return false;
      vistas.add(chave);
      return true;
    });
}

export const ETAPAS = ["Dados", "Local", "Atrações", "Ingressos", "Revisão"] as const;

// Mensagem de erro da etapa, ou null se estiver tudo certo. `exigirFuturo`: só ao publicar.
export function validarEtapa(etapa: number, f: EventoForm, { edicao }: { edicao: boolean }): string | null {
  if (etapa === 0) {
    if (!f.titulo.trim()) return "Dê um título ao evento.";
    const inicio = lerDataHora(f.data, f.hora);
    if (!inicio) return "Informe a data (DD/MM/AAAA) e a hora (HH:MM) de início.";
    if (!edicao && inicio.getTime() < Date.now()) return "O início precisa ser no futuro.";
    if (f.dataFim || f.horaFim) {
      const fim = lerDataHora(f.dataFim, f.horaFim);
      if (!fim) return "Data e hora de término incompletas ou inválidas.";
      if (fim.getTime() < inicio.getTime()) return "O término não pode ser antes do início.";
    }
    if (f.imagemUrl.trim() && !urlValida(f.imagemUrl)) return "A foto de capa precisa ser um link http(s).";
    if (listaDeTags(f.tags).length > 8) return "Use no máximo 8 selos.";
    if (listaDeTags(f.tags).some((t) => t.length > 24)) return "Cada selo pode ter no máximo 24 caracteres.";
  }
  if (etapa === 1) {
    if (!f.cidade.trim()) return "Informe a cidade.";
    if (!f.nomeLocal.trim()) return "Informe o nome do local.";
  }
  if (etapa === 2) {
    for (const a of f.atracoes) {
      if (!a.nome.trim()) return "Toda atração precisa de um nome (ou remova a linha vazia).";
      if (a.fotoUrl.trim() && !urlValida(a.fotoUrl)) return `A foto de ${a.nome.trim()} precisa ser um link http(s).`;
    }
  }
  if (etapa === 3 && !edicao) {
    if (f.lotes.length === 0) return "Crie pelo menos um lote de ingressos.";
    for (const l of f.lotes) {
      const nome = l.nome.trim() || "Lote sem nome";
      if (!l.nome.trim()) return "Todo lote precisa de um nome.";
      if (lerPreco(l.preco) === null) return `${nome}: informe o preço (use 0 para grátis).`;
      const q = Number(l.quantidade);
      if (!Number.isInteger(q) || q < 1 || q > 1_000_000) return `${nome}: quantidade deve ser um inteiro a partir de 1.`;
      if (l.grupo) {
        const t = Number(l.tamanhoGrupo);
        const p = Number(l.prazoHoras);
        const d = Number(l.descontoPct.replace(",", "."));
        if (!Number.isInteger(t) || t < 2 || t > 50) return `${nome}: o grupo deve ter de 2 a 50 pessoas.`;
        if (!Number.isInteger(p) || p < 1 || p > 720) return `${nome}: o prazo do grupo vai de 1 a 720 horas.`;
        if (!Number.isFinite(d) || d < 0 || d > 99) return `${nome}: o desconto do grupo vai de 0% a 99%.`;
      }
    }
  }
  return null;
}

export function corpoLote(l: LoteForm) {
  const base = { nome: l.nome.trim(), preco: lerPreco(l.preco)!, quantidade: Number(l.quantidade) };
  if (!l.grupo) return base;
  const fracao = Math.round(Number(l.descontoPct.replace(",", ".")) * 100) / 10000;
  return {
    ...base,
    tamanhoGrupo: Number(l.tamanhoGrupo),
    prazoGrupoHoras: Number(l.prazoHoras),
    descontoGrupo: fracao.toFixed(4),
  };
}

export function corpoEvento(f: EventoForm, { edicao }: { edicao: boolean }) {
  const inicio = lerDataHora(f.data, f.hora)!;
  const fim = f.dataFim || f.horaFim ? lerDataHora(f.dataFim, f.horaFim) : null;
  return {
    titulo: f.titulo.trim(),
    descricao: f.descricao.trim() || null,
    imagemUrl: f.imagemUrl.trim() || null,
    comecaEm: inicio.toISOString(),
    terminaEm: fim ? fim.toISOString() : null,
    nomeLocal: f.nomeLocal.trim(),
    endereco: f.endereco.trim() || null,
    cidade: f.cidade.trim(),
    tags: listaDeTags(f.tags),
    atracoes: f.atracoes.map((a) => ({
      nome: a.nome.trim(),
      fotoUrl: a.fotoUrl.trim() || null,
      username: a.username.trim().replace(/^@/, "") || null,
    })),
    // Na edição os lotes não são enviados: ficam como estão.
    ...(edicao ? {} : { lotes: f.lotes.map(corpoLote) }),
  };
}

type EventoApi = {
  titulo: string;
  descricao?: string | null;
  imagemUrl?: string | null;
  comecaEm: string;
  terminaEm?: string | null;
  nomeLocal?: string | null;
  endereco?: string | null;
  cidade: string;
  tags?: string[];
  atracoes?: { nome: string; fotoUrl?: string | null; usuario?: { username: string } | null }[];
};

export function formDoEvento(e: EventoApi): EventoForm {
  const inicio = paraCamposDataHora(e.comecaEm);
  const fim = paraCamposDataHora(e.terminaEm);
  return {
    ...formVazio(),
    titulo: e.titulo,
    descricao: e.descricao ?? "",
    imagemUrl: e.imagemUrl ?? "",
    data: inicio.data,
    hora: inicio.hora,
    dataFim: fim.data,
    horaFim: fim.hora,
    tags: (e.tags ?? []).join(", "),
    nomeLocal: e.nomeLocal ?? "",
    endereco: e.endereco ?? "",
    cidade: e.cidade,
    atracoes: (e.atracoes ?? []).map((a) => ({
      chave: novaChave(),
      nome: a.nome,
      fotoUrl: a.fotoUrl ?? "",
      username: a.usuario?.username ?? "",
    })),
    lotes: [],
  };
}

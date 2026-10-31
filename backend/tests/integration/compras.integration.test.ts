import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Estes testes usam um Postgres de verdade (sem mock): conferem o que o Prisma simulado não
// consegue, como transações que desfazem, concorrência e a devolução na expiração.
// Rodam só quando INTEGRATION_DATABASE_URL aponta para um banco com as migrações aplicadas
// (a CI faz isso); sem a variável, são pulados.
const url = process.env.INTEGRATION_DATABASE_URL;

type App = typeof import("../../src/app").default;
type Usuario = { id: string; token: string };

describe.skipIf(!url)("fluxo de compra com Postgres real", () => {
  const run = Date.now().toString(36);
  const SENHA = "senha-de-integracao-1";
  let prisma: PrismaClient;
  let app: App;

  // CPF válido e único por usuário: 9 dígitos a partir de um contador + os 2 verificadores.
  let proximoCpf = Number(run.replace(/\D/g, "").slice(0, 6) || "1") * 1000;
  const gerarCpf = () => {
    const base = String(++proximoCpf).padStart(9, "1").slice(0, 9);
    const dv = (digitos: string) => {
      const soma = digitos.split("").reduce((total, d, i) => total + Number(d) * (digitos.length + 1 - i), 0);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    const d1 = dv(base);
    return `${base}${d1}${dv(`${base}${d1}`)}`;
  };

  const auth = (usuario: Usuario) => ({ Authorization: `Bearer ${usuario.token}` });

  async function criarUsuario(nome: string): Promise<Usuario> {
    const email = `${nome}-${run}@integracao.test`;
    const cadastro = await request(app).post("/usuarios").send({ nome, username: `${nome}-${run}`, email, senha: SENHA, cpf: gerarCpf() });
    expect(cadastro.status).toBe(201);
    const login = await request(app).post("/auth/login").send({ email, senha: SENHA });
    expect(login.status).toBe(200);
    return { id: cadastro.body.id, token: login.body.token };
  }

  async function criarEventoComLote(lote: Record<string, unknown>) {
    const evento = await prisma.evento.create({
      data: { titulo: `Evento ${run}`, cidade: "Porto Alegre", comecaEm: new Date(Date.now() + 7 * 86_400_000) },
    });
    const criado = await prisma.lote.create({ data: { eventoId: evento.id, nome: "Pista", ...lote } as never });
    return { evento, lote: criado };
  }

  const estoque = async (loteId: string) =>
    prisma.lote.findUniqueOrThrow({ where: { id: loteId }, select: { quantidadeVendida: true, quantidadeReservada: true } });

  async function criarGrupo(lider: Usuario, membros: Usuario[]) {
    const grupo = await request(app).post("/grupos").set(auth(lider)).send({ nome: `Grupo ${run}` });
    expect(grupo.status).toBe(201);
    for (const membro of membros) {
      const res = await request(app).post(`/grupos/${grupo.body.id}/members`).set(auth(lider)).send({ usuarioId: membro.id });
      expect(res.status).toBe(201);
    }
    return grupo.body.id as string;
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    prisma = new PrismaClient({ datasourceUrl: url });
    app = (await import("../../src/app")).default;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("compra individual", () => {
    it("vende, cobra a taxa, emite os ingressos e desfaz tudo quando falta estoque", async () => {
      const u1 = await criarUsuario("ana");
      const u2 = await criarUsuario("bia");
      const { lote } = await criarEventoComLote({ preco: "40.00", quantidade: 3 });

      const ok = await request(app).post("/pedidos").set(auth(u1)).send({ loteId: lote.id, quantidade: 2 });
      expect(ok.status).toBe(201);
      expect(ok.body).toMatchObject({ status: "PAGO", subtotal: "80", taxaServico: "10", valor: "90" });
      expect(ok.body.ingressos).toHaveLength(2);
      expect(await estoque(lote.id)).toEqual({ quantidadeVendida: 2, quantidadeReservada: 0 });

      // 2 + 2 > 3: a transação desfaz o incremento do estoque.
      const negado = await request(app).post("/pedidos").set(auth(u1)).send({ loteId: lote.id, quantidade: 2 });
      expect(negado.status).toBe(409);
      expect(await estoque(lote.id)).toEqual({ quantidadeVendida: 2, quantidadeReservada: 0 });
      expect(await prisma.pedido.count({ where: { loteId: lote.id } })).toBe(1);

      const ultimo = await request(app).post("/pedidos").set(auth(u2)).send({ loteId: lote.id, quantidade: 1 });
      expect(ultimo.status).toBe(201);
      expect((await estoque(lote.id)).quantidadeVendida).toBe(3);

      const meus = await request(app).get("/ingressos").set(auth(u1));
      expect(meus.body).toHaveLength(2);
      const deOutro = await request(app).get(`/ingressos/${meus.body[0].id}`).set(auth(u2));
      expect(deOutro.status).toBe(404);
    });

    it("nunca vende mais que o estoque, mesmo com pedidos simultâneos", async () => {
      const u = await criarUsuario("caio");
      const { lote } = await criarEventoComLote({ preco: "10.00", quantidade: 3 });

      const respostas = await Promise.all(
        Array.from({ length: 6 }, () => request(app).post("/pedidos").set(auth(u)).send({ loteId: lote.id, quantidade: 1 })),
      );

      const status = respostas.map((res) => res.status);
      expect(status.filter((s) => s === 201)).toHaveLength(3);
      expect(status.filter((s) => s === 409)).toHaveLength(3);
      expect(await estoque(lote.id)).toEqual({ quantidadeVendida: 3, quantidadeReservada: 0 });
      expect(await prisma.ingresso.count({ where: { loteId: lote.id } })).toBe(3);
    });
  });

  describe("compra em grupo", () => {
    const loteDeGrupo = { preco: "100.00", quantidade: 10, tamanhoGrupo: 3, descontoGrupo: "0.2", prazoGrupoHoras: 24 };

    it("cada um paga a sua cota e o último confirma e libera os ingressos de todos", async () => {
      const [a, b, c] = [await criarUsuario("duda"), await criarUsuario("edu"), await criarUsuario("fabi")];
      const grupoId = await criarGrupo(a, [b, c]);
      const { lote } = await criarEventoComLote(loteDeGrupo);

      const compra = await request(app).post("/grupos/compras").set(auth(a)).send({ grupoId, loteId: lote.id, participantesIds: [b.id, c.id] });
      expect(compra.status).toBe(201);
      expect(await estoque(lote.id)).toEqual({ quantidadeVendida: 0, quantidadeReservada: 3 });

      const pagaA = await request(app).post(`/grupos/compras/${compra.body.id}/pagar`).set(auth(a));
      expect(pagaA.status).toBe(200);
      expect(pagaA.body.status).toBe("PENDENTE");
      const pedidoA = await prisma.pedido.findFirstOrThrow({ where: { usuarioId: a.id, loteId: lote.id } });
      expect(pedidoA).toMatchObject({ status: "PAGO", quantidade: 1 });
      expect([pedidoA.subtotal, pedidoA.desconto, pedidoA.taxaServico, pedidoA.valor].map(String)).toEqual(["100", "20", "10", "90"]);
      expect(await estoque(lote.id)).toEqual({ quantidadeVendida: 1, quantidadeReservada: 2 });
      expect(await prisma.ingresso.count({ where: { loteId: lote.id } })).toBe(0);

      const duplicado = await request(app).post(`/grupos/compras/${compra.body.id}/pagar`).set(auth(a));
      expect(duplicado.status).toBe(409);
      expect(await prisma.pedido.count({ where: { usuarioId: a.id, loteId: lote.id } })).toBe(1);

      expect((await request(app).post(`/grupos/compras/${compra.body.id}/pagar`).set(auth(b))).status).toBe(200);
      const ultima = await request(app).post(`/grupos/compras/${compra.body.id}/pagar`).set(auth(c));
      expect(ultima.status).toBe(200);
      expect(ultima.body.status).toBe("CONFIRMADA");

      expect(await estoque(lote.id)).toEqual({ quantidadeVendida: 3, quantidadeReservada: 0 });
      const ingressos = await prisma.ingresso.findMany({ where: { loteId: lote.id } });
      expect(ingressos.map((i) => i.donoId).sort()).toEqual([a.id, b.id, c.id].sort());
      expect(new Set(ingressos.map((i) => i.codigoQr)).size).toBe(3);
      expect((await request(app).get("/ingressos").set(auth(b))).body).toHaveLength(1);

      const depois = await request(app).post(`/grupos/compras/${compra.body.id}/pagar`).set(auth(b));
      expect(depois.status).toBe(409);
    });

    it("compra vencida expira na consulta: devolve o pago e libera as reservas, uma única vez", async () => {
      const [a, b, c] = [await criarUsuario("gabi"), await criarUsuario("hugo"), await criarUsuario("ivo")];
      const grupoId = await criarGrupo(a, [b, c]);
      const { lote } = await criarEventoComLote(loteDeGrupo);

      const compra = await request(app).post("/grupos/compras").set(auth(a)).send({ grupoId, loteId: lote.id, participantesIds: [b.id, c.id] });
      expect(compra.status).toBe(201);
      expect((await request(app).post(`/grupos/compras/${compra.body.id}/pagar`).set(auth(a))).status).toBe(200);
      expect(await estoque(lote.id)).toEqual({ quantidadeVendida: 1, quantidadeReservada: 2 });

      await prisma.compraGrupo.update({ where: { id: compra.body.id }, data: { expiraEm: new Date(Date.now() - 60_000) } });

      const lista = await request(app).get("/grupos/compras").set(auth(b));
      expect(lista.status).toBe(200);
      const expirada = lista.body.find((item: { id: string }) => item.id === compra.body.id);
      expect(expirada.status).toBe("EXPIRADA");
      const statusPorUsuario = Object.fromEntries(expirada.participantes.map((p: { usuarioId: string; status: string }) => [p.usuarioId, p.status]));
      expect(statusPorUsuario).toEqual({ [a.id]: "REEMBOLSADO", [b.id]: "PENDENTE", [c.id]: "PENDENTE" });
      expect((await prisma.pedido.findFirstOrThrow({ where: { usuarioId: a.id, loteId: lote.id } })).status).toBe("CANCELADO");
      expect(await estoque(lote.id)).toEqual({ quantidadeVendida: 0, quantidadeReservada: 0 });

      // Consultar de novo não devolve em dobro.
      await request(app).get(`/grupos/compras/${compra.body.id}`).set(auth(c));
      expect(await estoque(lote.id)).toEqual({ quantidadeVendida: 0, quantidadeReservada: 0 });

      const tardio = await request(app).post(`/grupos/compras/${compra.body.id}/pagar`).set(auth(b));
      expect(tardio.status).toBe(409);
      expect(await prisma.ingresso.count({ where: { loteId: lote.id } })).toBe(0);
    });
  });

  describe("validação na portaria", () => {
    it("dá baixa uma única vez, mesmo com leituras simultâneas do mesmo código", async () => {
      const [adm, u] = [await criarUsuario("jade"), await criarUsuario("kau")];
      await prisma.usuario.update({ where: { id: adm.id }, data: { papel: "ADMIN" } });
      const { lote, evento } = await criarEventoComLote({ preco: "10.00", quantidade: 5 });
      const pedido = await request(app).post("/pedidos").set(auth(u)).send({ loteId: lote.id, quantidade: 1 });
      const codigo = pedido.body.ingressos[0].codigoQr as string;

      const respostas = await Promise.all(
        Array.from({ length: 5 }, () => request(app).post("/ingressos/validar").set(auth(adm)).send({ codigo, eventoId: evento.id })),
      );

      const status = respostas.map((res) => res.status).sort();
      expect(status).toEqual([200, 409, 409, 409, 409]);
      expect(respostas.filter((res) => res.status === 409).every((res) => res.body.resultado === "JA_UTILIZADO")).toBe(true);
      expect((await prisma.ingresso.findFirstOrThrow({ where: { codigoQr: codigo } })).status).toBe("USADO");
      expect(await prisma.validacaoIngresso.count({ where: { codigoLido: codigo, resultado: "VALIDO" } })).toBe(1);
      expect(await prisma.validacaoIngresso.count({ where: { codigoLido: codigo } })).toBe(5);

      const comum = await request(app).post("/ingressos/validar").set(auth(u)).send({ codigo });
      expect(comum.status).toBe(403);
    });
  });

  describe("convite de grupo", () => {
    it("o líder gera um código fixo e quem tem o código entra uma única vez", async () => {
      const [lider, amigo, estranho] = [await criarUsuario("lia"), await criarUsuario("max"), await criarUsuario("noe")];
      const grupoId = await criarGrupo(lider, []);

      const a = await request(app).post(`/grupos/${grupoId}/convite`).set(auth(lider));
      const b = await request(app).post(`/grupos/${grupoId}/convite`).set(auth(lider));
      expect(a.status).toBe(200);
      expect(b.body.codigo).toBe(a.body.codigo);
      expect((await request(app).post(`/grupos/${grupoId}/convite`).set(auth(estranho))).status).toBe(404);

      const entra = await request(app).post("/grupos/entrar").set(auth(amigo)).send({ codigo: a.body.codigo.toLowerCase() });
      expect(entra.body).toEqual({ grupo: { id: grupoId, nome: `Grupo ${run}` }, jaEraMembro: false });
      const repete = await request(app).post("/grupos/entrar").set(auth(amigo)).send({ codigo: a.body.codigo });
      expect(repete.body.jaEraMembro).toBe(true);
      expect(await prisma.membroGrupo.count({ where: { grupoId } })).toBe(2);

      expect((await request(app).post("/grupos/entrar").set(auth(estranho)).send({ codigo: "NAOEXIST" })).status).toBe(404);
    });
  });

  describe("transferência de ingresso", () => {
    it("troca o dono e o código; o QR antigo deixa de valer e ingresso usado não transfere", async () => {
      const [adm, de, para] = [await criarUsuario("olga"), await criarUsuario("pedro"), await criarUsuario("rita")];
      await prisma.usuario.update({ where: { id: adm.id }, data: { papel: "ADMIN" } });
      const { lote } = await criarEventoComLote({ preco: "10.00", quantidade: 5 });
      const pedido = await request(app).post("/pedidos").set(auth(de)).send({ loteId: lote.id, quantidade: 2 });
      const [primeiro, segundo] = pedido.body.ingressos as { id: string; codigoQr: string }[];

      const res = await request(app).post(`/ingressos/${primeiro.id}/transferir`).set(auth(de)).send({ username: `rita-${run}` });
      expect(res.status).toBe(200);
      expect(res.body.donoId).toBe(para.id);
      expect(res.body.codigoQr).not.toBe(primeiro.codigoQr);

      expect((await request(app).get("/ingressos").set(auth(para))).body).toHaveLength(1);
      expect((await request(app).get(`/ingressos/${primeiro.id}`).set(auth(de))).status).toBe(404);
      expect((await request(app).post("/ingressos/validar").set(auth(adm)).send({ codigo: primeiro.codigoQr })).status).toBe(404);
      expect((await request(app).post("/ingressos/validar").set(auth(adm)).send({ codigo: res.body.codigoQr })).status).toBe(200);

      // Quem já transferiu não é mais dono; ingresso já validado não transfere.
      expect((await request(app).post(`/ingressos/${primeiro.id}/transferir`).set(auth(de)).send({ username: `rita-${run}` })).status).toBe(404);
      await request(app).post("/ingressos/validar").set(auth(adm)).send({ codigo: segundo.codigoQr });
      expect((await request(app).post(`/ingressos/${segundo.id}/transferir`).set(auth(de)).send({ username: `rita-${run}` })).status).toBe(409);
    });
  });

  describe("avaliações", () => {
    it("só quem foi ao evento avalia, uma nota por pessoa, e a média do organizador soma os eventos dele", async () => {
      const [adm, org, a, b] = [await criarUsuario("sol"), await criarUsuario("tito"), await criarUsuario("uma"), await criarUsuario("vera")];
      await prisma.usuario.update({ where: { id: adm.id }, data: { papel: "ADMIN" } });
      const evento1 = await prisma.evento.create({ data: { titulo: `Av1 ${run}`, cidade: "Recife", comecaEm: new Date(Date.now() + 86_400_000), criadoPorId: org.id } });
      const evento2 = await prisma.evento.create({ data: { titulo: `Av2 ${run}`, cidade: "Recife", comecaEm: new Date(Date.now() + 86_400_000), criadoPorId: org.id } });
      const lote1 = await prisma.lote.create({ data: { eventoId: evento1.id, nome: "Pista", preco: "10.00", quantidade: 5 } });
      const lote2 = await prisma.lote.create({ data: { eventoId: evento2.id, nome: "Pista", preco: "10.00", quantidade: 5 } });

      const compra = async (usuario: Usuario, loteId: string) =>
        (await request(app).post("/pedidos").set(auth(usuario)).send({ loteId, quantidade: 1 })).body.ingressos[0].codigoQr as string;
      const codigoA1 = await compra(a, lote1.id);
      const codigoB2 = await compra(b, lote2.id);

      // Com o ingresso ainda não usado, não pode avaliar.
      expect((await request(app).post(`/eventos/${evento1.id}/avaliacoes`).set(auth(a)).send({ nota: 5 })).status).toBe(403);

      await request(app).post("/ingressos/validar").set(auth(adm)).send({ codigo: codigoA1 });
      await request(app).post("/ingressos/validar").set(auth(adm)).send({ codigo: codigoB2 });

      expect((await request(app).post(`/eventos/${evento1.id}/avaliacoes`).set(auth(a)).send({ nota: 5 })).status).toBe(200);
      expect((await request(app).post(`/eventos/${evento2.id}/avaliacoes`).set(auth(b)).send({ nota: 2, comentario: "ok" })).status).toBe(200);
      // Quem foi ao evento 2 não avalia o 1; o organizador não avalia o próprio evento.
      expect((await request(app).post(`/eventos/${evento1.id}/avaliacoes`).set(auth(b)).send({ nota: 1 })).status).toBe(403);
      expect((await request(app).post(`/eventos/${evento1.id}/avaliacoes`).set(auth(org)).send({ nota: 5 })).status).toBe(403);

      const resumo = await request(app).get(`/eventos/${evento1.id}/avaliacoes`);
      expect(resumo.body.evento).toEqual({ media: 5, total: 1 });
      expect(resumo.body.organizador).toMatchObject({ id: org.id, media: 3.5, total: 2 });

      // Avaliar de novo substitui a nota (não duplica).
      await request(app).post(`/eventos/${evento1.id}/avaliacoes`).set(auth(a)).send({ nota: 3 });
      const depois = await request(app).get(`/eventos/${evento1.id}/avaliacoes`);
      expect(depois.body.evento).toEqual({ media: 3, total: 1 });
      expect(await prisma.avaliacaoEvento.count({ where: { eventoId: evento1.id } })).toBe(1);
    });
  });
});

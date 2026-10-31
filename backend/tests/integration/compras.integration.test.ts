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

  const auth = (usuario: Usuario) => ({ Authorization: `Bearer ${usuario.token}` });

  async function criarUsuario(nome: string): Promise<Usuario> {
    const email = `${nome}-${run}@integracao.test`;
    const cadastro = await request(app).post("/usuarios").send({ nome, username: `${nome}-${run}`, email, senha: SENHA });
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
});

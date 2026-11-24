import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { programaEquipe } from "./helpers/equipe";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const evento = {
  id: "e1",
  titulo: "Show",
  cidade: "Recife",
  comecaEm: new Date("2026-12-01T22:00:00.000Z"),
  terminaEm: null,
  criadoPorId: "dono",
};

function programaDados() {
  prismaMock.ingresso.groupBy.mockResolvedValue([
    { status: "VALIDO", _count: { _all: 7 } },
    { status: "USADO", _count: { _all: 3 } },
    { status: "CANCELADO", _count: { _all: 1 } },
  ]);
  prismaMock.validacaoIngresso.groupBy.mockResolvedValue([
    { resultado: "VALIDO", _count: { _all: 3 } },
    { resultado: "JA_UTILIZADO", _count: { _all: 2 } },
  ]);
  prismaMock.lote.findMany.mockResolvedValue([
    { id: "l1", nome: "Pista", preco: "80", quantidade: 100, quantidadeVendida: 10, quantidadeReservada: 5 },
  ]);
  prismaMock.pedido.aggregate.mockResolvedValue({ _sum: { valor: "900.5" } });
  prismaMock.$queryRaw.mockResolvedValue([{ hora: new Date("2026-12-01T22:00:00.000Z"), total: 3n }]);
  prismaMock.ingresso.findMany.mockResolvedValue([
    { id: "i1", usadoEm: new Date("2026-12-01T22:10:00.000Z"), dono: { nome: "Ana" }, lote: { nome: "Pista" } },
  ]);
}

describe("GET /eventos/:eventoId/dashboard", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.evento.findUnique.mockResolvedValue(evento);
    programaEquipe({ dono: "DONO", produtor: "PRODUTOR", porteiro: "PORTEIRO" });
    programaDados();
  });

  it("sem token responde 401", async () => {
    expect((await request(app).get("/eventos/e1/dashboard")).status).toBe(401);
  });

  it.each(["estranho"])("%s recebe 403 e nenhum dado é consultado", async (quem) => {
    const res = await request(app).get("/eventos/e1/dashboard").set(logadoComo(quem));

    expect(res.status).toBe(403);
    expect(prismaMock.ingresso.groupBy).not.toHaveBeenCalled();
  });

  it("conta liberada para resetar o seed não vê o painel de um evento que não é dela", async () => {
    const res = await request(app).get("/eventos/e1/dashboard").set(logadoComo("adm", true));

    expect(res.status).toBe(403);
  });

  it("evento inexistente responde 404", async () => {
    prismaMock.evento.findUnique.mockResolvedValue(null);

    expect((await request(app).get("/eventos/nada/dashboard").set(logadoComo("dono"))).status).toBe(404);
  });

  it("o dono vê entradas, tentativas, lotes e a receita", async () => {
    const res = await request(app).get("/eventos/e1/dashboard").set(logadoComo("dono"));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      evento: { id: "e1", titulo: "Show" },
      funcao: "DONO",
      ingressos: { emitidos: 11, aguardando: 7, entraram: 3, cancelados: 1 },
      tentativas: { liberadas: 3, jaUtilizados: 2, invalidas: 0 },
      entradasPorHora: [{ hora: "2026-12-01T22:00:00.000Z", total: 3 }],
      ultimasEntradas: [{ ingressoId: "i1", dono: "Ana", lote: "Pista" }],
      lotes: [{ id: "l1", nome: "Pista", quantidade: 100, vendidos: 10, reservados: 5, disponiveis: 85, preco: "80.00" }],
      receita: "900.50",
    });
  });

  it("as consultas são sempre filtradas pelo evento pedido", async () => {
    await request(app).get("/eventos/e1/dashboard").set(logadoComo("dono"));

    expect(prismaMock.ingresso.groupBy.mock.calls[0][0].where).toEqual({ eventoId: "e1" });
    expect(prismaMock.validacaoIngresso.groupBy.mock.calls[0][0].where).toEqual({ eventoId: "e1" });
    expect(prismaMock.lote.findMany.mock.calls[0][0].where).toEqual({ eventoId: "e1" });
    expect(prismaMock.pedido.aggregate.mock.calls[0][0].where).toEqual({ eventoId: "e1", status: "PAGO" });
  });

  it("o produtor vê o painel completo", async () => {
    const res = await request(app).get("/eventos/e1/dashboard").set(logadoComo("produtor"));

    expect(res.status).toBe(200);
    expect(res.body.receita).toBe("900.50");
  });

  it("o porteiro vê as entradas, mas não o dinheiro (sem receita nem preços)", async () => {
    const res = await request(app).get("/eventos/e1/dashboard").set(logadoComo("porteiro"));

    expect(res.status).toBe(200);
    expect(res.body.funcao).toBe("PORTEIRO");
    expect(res.body.ingressos.entraram).toBe(3);
    expect(res.body).not.toHaveProperty("receita");
    expect(res.body.lotes[0]).not.toHaveProperty("preco");
  });

  it("evento sem movimento devolve zeros e receita 0.00", async () => {
    prismaMock.ingresso.groupBy.mockResolvedValue([]);
    prismaMock.validacaoIngresso.groupBy.mockResolvedValue([]);
    prismaMock.lote.findMany.mockResolvedValue([]);
    prismaMock.pedido.aggregate.mockResolvedValue({ _sum: { valor: null } });
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.ingresso.findMany.mockResolvedValue([]);

    const res = await request(app).get("/eventos/e1/dashboard").set(logadoComo("dono"));

    expect(res.body).toMatchObject({
      ingressos: { emitidos: 0, aguardando: 0, entraram: 0, cancelados: 0 },
      tentativas: { liberadas: 0, jaUtilizados: 0, invalidas: 0 },
      lotes: [],
      receita: "0.00",
    });
  });
});

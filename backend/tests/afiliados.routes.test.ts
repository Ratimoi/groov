import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock, runTransactionCallbacks } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const lote = { id: "l1", eventoId: "e1", nome: "Pista", preco: "100.00", quantidade: 100 };
const promotor = {
  usuarioId: "prom1",
  codigoAfiliado: "ABCD2345",
  usuario: { id: "prom1", nome: "Paula", username: "paula", avatarUrl: null },
  evento: { descontoAfiliado: "0.2000", comissaoPromotor: "0.1000" },
};

function loja() {
  prismaMock.lote.findUnique.mockResolvedValue(lote);
  runTransactionCallbacks();
  prismaMock.lote.update.mockResolvedValue({ ...lote, quantidadeVendida: 1, quantidadeReservada: 0 });
  prismaMock.pedido.create.mockImplementation(async ({ data }) => ({ id: "p1", ...data }));
}

describe("compra com código de promotor (POST /pedidos)", () => {
  beforeEach(resetPrismaMock);

  it("aplica o desconto do promotor, cobra a taxa sobre o valor com desconto e registra a comissão", async () => {
    loja();
    prismaMock.eventoMembro.findFirst.mockResolvedValue(promotor);

    const res = await request(app)
      .post("/pedidos")
      .set(logadoComo("CLIENTE", "u1"))
      .send({ loteId: "l1", quantidade: 2, codigoAfiliado: "abcd2345 " });

    expect(res.status).toBe(201);
    expect(prismaMock.eventoMembro.findFirst.mock.calls[0][0].where).toMatchObject({ eventoId: "e1", cargo: "PROMOTOR", codigoAfiliado: "ABCD2345" });
    const { data } = prismaMock.pedido.create.mock.calls[0][0];
    // 2 x 100 = 200; desconto 20% = 40; base 160; taxa 12,5% = 20; total 180; comissão 10% de 160 = 16.
    expect(data).toMatchObject({
      subtotal: "200.00",
      desconto: "40.00",
      taxaServico: "20.00",
      valor: "180.00",
      promotorId: "prom1",
      codigoAfiliado: "ABCD2345",
      comissao: "16.00",
    });
  });

  it("sem código nada muda: sem desconto e sem promotor", async () => {
    loja();

    await request(app).post("/pedidos").set(logadoComo("CLIENTE", "u1")).send({ loteId: "l1", quantidade: 1 });

    const { data } = prismaMock.pedido.create.mock.calls[0][0];
    expect(data).toMatchObject({ desconto: "0.00", valor: "112.50" });
    expect(data).not.toHaveProperty("promotorId");
  });

  it("código que não existe no evento responde 400 e não vende nada", async () => {
    loja();
    prismaMock.eventoMembro.findFirst.mockResolvedValue(null);

    const res = await request(app).post("/pedidos").set(logadoComo("CLIENTE", "u1")).send({ loteId: "l1", quantidade: 1, codigoAfiliado: "NADA" });

    expect(res.status).toBe(400);
    expect(prismaMock.pedido.create).not.toHaveBeenCalled();
  });

  it("o promotor não usa o próprio código", async () => {
    loja();
    prismaMock.eventoMembro.findFirst.mockResolvedValue(promotor);

    const res = await request(app).post("/pedidos").set(logadoComo("CLIENTE", "prom1")).send({ loteId: "l1", quantidade: 1, codigoAfiliado: "ABCD2345" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/próprio código/);
    expect(prismaMock.pedido.create).not.toHaveBeenCalled();
  });

  it("codigoAfiliado que não é texto responde 400", async () => {
    const res = await request(app).post("/pedidos").set(logadoComo()).send({ loteId: "l1", quantidade: 1, codigoAfiliado: 123 });

    expect(res.status).toBe(400);
  });
});

describe("GET /eventos/:id/afiliado/:codigo", () => {
  beforeEach(resetPrismaMock);

  it("devolve o desconto e quem é o promotor", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    prismaMock.eventoMembro.findFirst.mockResolvedValue(promotor);

    const res = await request(app).get("/eventos/e1/afiliado/abcd2345").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ codigo: "ABCD2345", descontoAfiliado: 0.2, promotor: { nome: "Paula", username: "paula" } });
  });

  it("código inválido responde 404", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    prismaMock.eventoMembro.findFirst.mockResolvedValue(null);

    expect((await request(app).get("/eventos/e1/afiliado/xxxx").set(auth)).status).toBe(404);
  });

  it("sem token responde 401", async () => {
    expect((await request(app).get("/eventos/e1/afiliado/abcd")).status).toBe(401);
  });
});

describe("GET /eventos/:id/promotor (painel)", () => {
  beforeEach(resetPrismaMock);

  it("mostra o código, as condições e as vendas do promotor", async () => {
    const auth = logadoComo("CLIENTE", "prom1");
    prismaMock.eventoMembro.findFirst.mockResolvedValue({
      codigoAfiliado: "ABCD2345",
      evento: { titulo: "Festival", descontoAfiliado: "0.2000", comissaoPromotor: "0.1000" },
    });
    prismaMock.pedido.groupBy.mockResolvedValue([{ promotorId: "prom1", _count: 3, _sum: { quantidade: 5, comissao: "42.5" } }]);

    const res = await request(app).get("/eventos/e1/promotor").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      evento: "Festival",
      codigo: "ABCD2345",
      descontoAfiliado: 0.2,
      comissaoPromotor: 0.1,
      pedidos: 3,
      ingressos: 5,
      comissaoTotal: "42.50",
    });
  });

  it("quem não é promotor do evento recebe 403", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    prismaMock.eventoMembro.findFirst.mockResolvedValue(null);

    expect((await request(app).get("/eventos/e1/promotor").set(auth)).status).toBe(403);
  });
});

describe("equipe: código do promotor", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.evento.findUnique.mockResolvedValue({ id: "e1", criadoPorId: "g1" });
    prismaMock.eventoMembro.upsert.mockImplementation(async ({ create }) => ({ id: "m1", ...create }));
  });

  it("PROMOTOR recebe um código; VALIDADOR não", async () => {
    const auth = logadoComo("CLIENTE", "g1");
    prismaMock.usuario.findUnique.mockImplementation(async ({ where }) => (where.username ? { id: "u2" } : { id: "g1", papel: "CLIENTE" }));

    const promo = await request(app).post("/eventos/e1/equipe").set(auth).send({ username: "ana", cargo: "PROMOTOR" });
    const valid = await request(app).post("/eventos/e1/equipe").set(auth).send({ username: "ana", cargo: "VALIDADOR" });

    expect(promo.body.codigoAfiliado).toMatch(/^[A-Z2-9]{8}$/);
    expect(valid.body.codigoAfiliado).toBeNull();
  });

  it("quem já era promotor mantém o mesmo código ao ser readicionado", async () => {
    const auth = logadoComo("CLIENTE", "g1");
    prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "g1", papel: "CLIENTE" }).mockResolvedValue({ id: "u2" });
    prismaMock.eventoMembro.findUnique.mockResolvedValue({ codigoAfiliado: "MESMO234" });

    const res = await request(app).post("/eventos/e1/equipe").set(auth).send({ username: "ana", cargo: "PROMOTOR" });

    expect(res.body.codigoAfiliado).toBe("MESMO234");
  });

  it("a lista da equipe traz as vendas de cada promotor", async () => {
    const auth = logadoComo("CLIENTE", "g1");
    prismaMock.eventoMembro.findMany.mockResolvedValue([{ id: "m1", usuarioId: "prom1", cargo: "PROMOTOR" }, { id: "m2", usuarioId: "v1", cargo: "VALIDADOR" }]);
    prismaMock.pedido.groupBy.mockResolvedValue([{ promotorId: "prom1", _count: 2, _sum: { quantidade: 4, comissao: "12" } }]);

    const res = await request(app).get("/eventos/e1/equipe").set(auth);

    expect(res.body[0].vendas).toEqual({ pedidos: 2, ingressos: 4, comissao: "12.00" });
    expect(res.body[1].vendas).toEqual({ pedidos: 0, ingressos: 0, comissao: "0.00" });
  });

  it("o gerente define desconto e comissão do programa no PUT do evento", async () => {
    const auth = logadoComo("CLIENTE", "g1");
    prismaMock.evento.findUnique.mockResolvedValue({ id: "e1", criadoPorId: "g1", comecaEm: new Date("2026-12-01"), terminaEm: null });
    prismaMock.evento.update.mockImplementation(async ({ data }) => ({ id: "e1", ...data }));

    const res = await request(app).put("/eventos/e1").set(auth).send({ descontoAfiliado: "0.15", comissaoPromotor: 0.1 });

    expect(res.status).toBe(200);
    expect(prismaMock.evento.update.mock.calls[0][0].data).toMatchObject({ descontoAfiliado: "0.1500", comissaoPromotor: "0.1000" });
  });

  it("desconto fora da faixa é recusado", async () => {
    const auth = logadoComo("CLIENTE", "g1");

    const res = await request(app).put("/eventos/e1").set(auth).send({ descontoAfiliado: 1 });

    expect(res.status).toBe(400);
  });
});

describe("cota de grupo com código de promotor (POST /grupos/compras/:id/pagar)", () => {
  const compraComCodigo = {
    id: "c1",
    loteId: "l1",
    status: "PENDENTE",
    expiraEm: new Date(Date.now() + 3_600_000),
    codigoAfiliado: "ABCD2345",
    participantes: [{ id: "pc1", usuarioId: "u1", status: "PENDENTE", pedidoId: null }],
  };

  function preparar(descontoGrupo: string) {
    resetPrismaMock();
    prismaMock.usuario.findUnique.mockResolvedValue({ id: "u1", papel: "CLIENTE" });
    prismaMock.compraGrupo.findUnique.mockResolvedValue(compraComCodigo);
    prismaMock.lote.findUnique.mockResolvedValue({ id: "l1", eventoId: "e1", preco: "100.00", descontoGrupo });
    prismaMock.eventoMembro.findFirst.mockResolvedValue(promotor); // desconto 20%, comissão 10%
    runTransactionCallbacks();
    prismaMock.pedido.create.mockResolvedValue({ id: "p1" });
    prismaMock.participanteCompra.update.mockResolvedValue({});
    prismaMock.lote.update.mockResolvedValue({});
    prismaMock.participanteCompra.count.mockResolvedValue(1);
  }

  it("desconto do promotor maior que o do grupo: usa o do promotor", async () => {
    preparar("0.1000");

    const res = await request(app).post("/grupos/compras/c1/pagar").set(logadoComo("CLIENTE", "u1"));

    expect(res.status).toBe(200);
    expect(prismaMock.pedido.create.mock.calls[0][0].data).toMatchObject({
      desconto: "20.00",
      taxaServico: "10.00",
      valor: "90.00",
      promotorId: "prom1",
      comissao: "8.00",
    });
  });

  it("desconto do grupo maior: mantém o do grupo (não somam) e ainda registra a comissão", async () => {
    preparar("0.3000");

    await request(app).post("/grupos/compras/c1/pagar").set(logadoComo("CLIENTE", "u1"));

    expect(prismaMock.pedido.create.mock.calls[0][0].data).toMatchObject({
      desconto: "30.00",
      taxaServico: "8.75",
      valor: "78.75",
      promotorId: "prom1",
      comissao: "7.00",
    });
  });
});

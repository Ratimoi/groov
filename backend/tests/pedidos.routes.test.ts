import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock, runTransactionCallbacks } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const lote = { id: "l1", eventoId: "e1", nome: "Pista", preco: "40.00", quantidade: 100 };

function lojaComEstoque(vendida = 2) {
  prismaMock.lote.findUnique.mockResolvedValue(lote);
  runTransactionCallbacks();
  prismaMock.lote.update.mockResolvedValue({ ...lote, quantidadeVendida: vendida, quantidadeReservada: 0 });
  prismaMock.pedido.create.mockImplementation(async ({ data }) => ({ id: "p1", ...data }));
}

describe("POST /pedidos", () => {
  beforeEach(resetPrismaMock);

  it("sem token responde 401 e não toca no banco", async () => {
    const res = await request(app).post("/pedidos").send({ loteId: "l1", quantidade: 1 });

    expect(res.status).toBe(401);
    expect(prismaMock.lote.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["sem loteId", { quantidade: 1 }],
    ["loteId vazio", { loteId: "  ", quantidade: 1 }],
    ["sem quantidade", { loteId: "l1" }],
    ["quantidade zero", { loteId: "l1", quantidade: 0 }],
    ["quantidade negativa", { loteId: "l1", quantidade: -1 }],
    ["quantidade fracionada", { loteId: "l1", quantidade: 1.5 }],
    ["quantidade em texto", { loteId: "l1", quantidade: "2" }],
    ["quantidade acima do limite por pedido", { loteId: "l1", quantidade: 11 }],
  ])("corpo inválido (%s) responde 400", async (_nome, corpo) => {
    const res = await request(app).post("/pedidos").set(logadoComo()).send(corpo);

    expect(res.status).toBe(400);
    expect(prismaMock.lote.findUnique).not.toHaveBeenCalled();
  });

  it("lote inexistente responde 404", async () => {
    prismaMock.lote.findUnique.mockResolvedValue(null);

    const res = await request(app).post("/pedidos").set(logadoComo()).send({ loteId: "x", quantidade: 1 });

    expect(res.status).toBe(404);
    expect(prismaMock.pedido.create).not.toHaveBeenCalled();
  });

  it("cria o pedido pago, calcula a taxa de 12,5% e emite um ingresso por unidade", async () => {
    lojaComEstoque();

    const res = await request(app).post("/pedidos").set(logadoComo("CLIENTE", "u1")).send({ loteId: "l1", quantidade: 2 });

    expect(res.status).toBe(201);
    expect(prismaMock.lote.update).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { quantidadeVendida: { increment: 2 } },
    });
    const { data } = prismaMock.pedido.create.mock.calls[0][0];
    expect(data).toMatchObject({
      usuarioId: "u1",
      eventoId: "e1",
      loteId: "l1",
      quantidade: 2,
      status: "PAGO",
      subtotal: "80.00",
      desconto: "0.00",
      taxaServico: "10.00",
      valor: "90.00",
    });
    const codigos = data.ingressos.create.map((ingresso: { codigoQr: string }) => ingresso.codigoQr);
    expect(codigos).toHaveLength(2);
    expect(new Set(codigos).size).toBe(2);
    for (const codigo of codigos) expect(codigo).toMatch(/^GRV-[A-HJ-NP-Z2-9]{12}$/);
    for (const ingresso of data.ingressos.create) expect(ingresso).toMatchObject({ donoId: "u1", eventoId: "e1", loteId: "l1" });
  });

  it("arredonda a taxa para o centavo mais próximo", async () => {
    prismaMock.lote.findUnique.mockResolvedValue({ ...lote, preco: "33.33" });
    runTransactionCallbacks();
    prismaMock.lote.update.mockResolvedValue({ ...lote, quantidadeVendida: 1, quantidadeReservada: 0 });
    prismaMock.pedido.create.mockImplementation(async ({ data }) => ({ id: "p1", ...data }));

    await request(app).post("/pedidos").set(logadoComo()).send({ loteId: "l1", quantidade: 1 });

    const { data } = prismaMock.pedido.create.mock.calls[0][0];
    expect(data).toMatchObject({ subtotal: "33.33", taxaServico: "4.17", valor: "37.50" });
  });

  it("ignora comprador, preço e status enviados no corpo", async () => {
    lojaComEstoque(1);

    await request(app)
      .post("/pedidos")
      .set(logadoComo("CLIENTE", "u1"))
      .send({ loteId: "l1", quantidade: 1, usuarioId: "u9", valor: "0.01", subtotal: "0.01", status: "PENDENTE" });

    const { data } = prismaMock.pedido.create.mock.calls[0][0];
    expect(data).toMatchObject({ usuarioId: "u1", subtotal: "40.00", valor: "45.00", status: "PAGO" });
  });

  it("estoque insuficiente responde 409 e não cria o pedido", async () => {
    prismaMock.lote.findUnique.mockResolvedValue(lote);
    runTransactionCallbacks();
    prismaMock.lote.update.mockResolvedValue({ ...lote, quantidadeVendida: 99, quantidadeReservada: 2 });

    const res = await request(app).post("/pedidos").set(logadoComo()).send({ loteId: "l1", quantidade: 3 });

    expect(res.status).toBe(409);
    expect(prismaMock.pedido.create).not.toHaveBeenCalled();
  });

  it("aceita comprar exatamente os últimos ingressos", async () => {
    prismaMock.lote.findUnique.mockResolvedValue(lote);
    runTransactionCallbacks();
    prismaMock.lote.update.mockResolvedValue({ ...lote, quantidadeVendida: 100, quantidadeReservada: 0 });
    prismaMock.pedido.create.mockImplementation(async ({ data }) => ({ id: "p1", ...data }));

    const res = await request(app).post("/pedidos").set(logadoComo()).send({ loteId: "l1", quantidade: 3 });

    expect(res.status).toBe(201);
  });
});

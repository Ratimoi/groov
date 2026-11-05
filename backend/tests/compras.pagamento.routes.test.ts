import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bearer, logadoComo } from "./helpers/auth";
import { prismaError } from "./helpers/prismaErrors";
import { prismaMock, resetPrismaMock, runTransactionCallbacks } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const AGORA = new Date("2026-11-01T12:00:00.000Z");
const FUTURO = new Date("2026-11-02T12:00:00.000Z");
const PASSADO = new Date("2026-10-31T12:00:00.000Z");

const lote = { id: "l1", eventoId: "e1", preco: "100.00", descontoGrupo: "0.2000" };

function participante(usuarioId: string, status = "PENDENTE", pedidoId: string | null = null) {
  return { id: `pc-${usuarioId}`, usuarioId, status, pedidoId };
}

function compra(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    loteId: "l1",
    status: "PENDENTE",
    expiraEm: FUTURO,
    participantes: [participante("u1"), participante("u2"), participante("u3")],
    ...overrides,
  };
}

// Dá ao teste um relógio fixo; o token é assinado depois, senão já nasce expirado para a API.
function relogioFixo() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AGORA);
  return bearer("u1");
}

function transacaoDePagamento(faltamPagar: number) {
  runTransactionCallbacks();
  prismaMock.pedido.create.mockResolvedValue({ id: "p-u1" });
  prismaMock.participanteCompra.update.mockResolvedValue({});
  prismaMock.lote.update.mockResolvedValue({});
  prismaMock.participanteCompra.count.mockResolvedValue(faltamPagar);
}

describe("POST /grupos/compras/:id/pagar", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.usuario.findUnique.mockResolvedValue({ id: "u1", papel: "CLIENTE" });
  });
  afterEach(() => vi.useRealTimers());

  it("sem token responde 401", async () => {
    const res = await request(app).post("/grupos/compras/c1/pagar");

    expect(res.status).toBe(401);
    expect(prismaMock.compraGrupo.findUnique).not.toHaveBeenCalled();
  });

  it("compra inexistente responde 404", async () => {
    prismaMock.compraGrupo.findUnique.mockResolvedValue(null);

    const res = await request(app).post("/grupos/compras/nada/pagar").set(bearer("u1"));

    expect(res.status).toBe(404);
  });

  it("quem não participa recebe 404 e nada é cobrado", async () => {
    prismaMock.compraGrupo.findUnique.mockResolvedValue(compra({ participantes: [participante("u2")] }));

    const res = await request(app).post("/grupos/compras/c1/pagar").set(bearer("u1"));

    expect(res.status).toBe(404);
    expect(prismaMock.pedido.create).not.toHaveBeenCalled();
  });

  it("ADMIN que não participa recebe 403", async () => {
    prismaMock.compraGrupo.findUnique.mockResolvedValue(compra({ participantes: [participante("u2")] }));

    const res = await request(app).post("/grupos/compras/c1/pagar").set(logadoComo("ADMIN", "adm"));

    expect(res.status).toBe(403);
  });

  it("paga a cota com o desconto do grupo e a taxa, e move a reserva para vendido", async () => {
    const auth = relogioFixo();
    prismaMock.compraGrupo.findUnique.mockResolvedValueOnce(compra()).mockResolvedValue(compra());
    prismaMock.lote.findUnique.mockResolvedValue(lote);
    transacaoDePagamento(2);

    const res = await request(app).post("/grupos/compras/c1/pagar").set(auth);

    expect(res.status).toBe(200);
    expect(prismaMock.pedido.create.mock.calls[0][0].data).toMatchObject({
      usuarioId: "u1",
      eventoId: "e1",
      loteId: "l1",
      quantidade: 1,
      status: "PAGO",
      subtotal: "100.00",
      desconto: "20.00",
      taxaServico: "10.00",
      valor: "90.00",
    });
    expect(prismaMock.participanteCompra.update).toHaveBeenCalledWith({
      where: { compraGrupoId_usuarioId: { compraGrupoId: "c1", usuarioId: "u1" }, status: "PENDENTE" },
      data: { status: "PAGO", pedidoId: "p-u1" },
    });
    expect(prismaMock.lote.update).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { quantidadeReservada: { decrement: 1 }, quantidadeVendida: { increment: 1 } },
    });
  });

  it("enquanto falta alguém pagar, a compra continua pendente e nenhum ingresso é emitido", async () => {
    const auth = relogioFixo();
    prismaMock.compraGrupo.findUnique.mockResolvedValueOnce(compra()).mockResolvedValue(compra());
    prismaMock.lote.findUnique.mockResolvedValue(lote);
    transacaoDePagamento(2);

    await request(app).post("/grupos/compras/c1/pagar").set(auth);

    expect(prismaMock.compraGrupo.update).not.toHaveBeenCalled();
    expect(prismaMock.ingresso.createMany).not.toHaveBeenCalled();
  });

  it("quando o último paga, confirma a compra e emite um ingresso para cada participante", async () => {
    const auth = relogioFixo();
    prismaMock.compraGrupo.findUnique.mockResolvedValueOnce(compra()).mockResolvedValue(compra({ status: "CONFIRMADA" }));
    prismaMock.lote.findUnique.mockResolvedValue(lote);
    transacaoDePagamento(0);
    prismaMock.participanteCompra.findMany.mockResolvedValue([
      { usuarioId: "u1", pedidoId: "p-u1" },
      { usuarioId: "u2", pedidoId: "p-u2" },
      { usuarioId: "u3", pedidoId: "p-u3" },
    ]);

    const res = await request(app).post("/grupos/compras/c1/pagar").set(auth);

    expect(res.status).toBe(200);
    expect(prismaMock.compraGrupo.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { status: "CONFIRMADA" } });
    const { data } = prismaMock.ingresso.createMany.mock.calls[0][0];
    expect(data.map((ingresso: { donoId: string }) => ingresso.donoId)).toEqual(["u1", "u2", "u3"]);
    expect(data.map((ingresso: { pedidoId: string }) => ingresso.pedidoId)).toEqual(["p-u1", "p-u2", "p-u3"]);
    expect(new Set(data.map((ingresso: { codigoQr: string }) => ingresso.codigoQr)).size).toBe(3);
  });

  it("quem já pagou recebe 409 e não é cobrado de novo", async () => {
    const auth = relogioFixo();
    prismaMock.compraGrupo.findUnique.mockResolvedValue(
      compra({ participantes: [participante("u1", "PAGO", "p-u1"), participante("u2")] }),
    );

    const res = await request(app).post("/grupos/compras/c1/pagar").set(auth);

    expect(res.status).toBe(409);
    expect(prismaMock.pedido.create).not.toHaveBeenCalled();
  });

  it("pagamento concorrente da mesma cota (já não estava pendente) responde 409", async () => {
    const auth = relogioFixo();
    prismaMock.compraGrupo.findUnique.mockResolvedValue(compra());
    prismaMock.lote.findUnique.mockResolvedValue(lote);
    transacaoDePagamento(2);
    prismaMock.participanteCompra.update.mockRejectedValue(prismaError("P2025"));

    const res = await request(app).post("/grupos/compras/c1/pagar").set(auth);

    expect(res.status).toBe(409);
    expect(prismaMock.lote.update).not.toHaveBeenCalled();
  });

  it.each(["CONFIRMADA", "EXPIRADA"])("compra %s responde 409", async (status) => {
    const auth = relogioFixo();
    prismaMock.compraGrupo.findUnique.mockResolvedValue(compra({ status }));

    const res = await request(app).post("/grupos/compras/c1/pagar").set(auth);

    expect(res.status).toBe(409);
    expect(prismaMock.pedido.create).not.toHaveBeenCalled();
  });

  it("prazo vencido: expira a compra, devolve o que foi pago, libera as reservas e responde 409", async () => {
    const auth = relogioFixo();
    prismaMock.compraGrupo.findUnique
      .mockResolvedValueOnce(compra({ expiraEm: PASSADO }))
      .mockResolvedValue({
        loteId: "l1",
        participantes: [
          { status: "PAGO", pedidoId: "p-u2" },
          { status: "PENDENTE", pedidoId: null },
          { status: "PENDENTE", pedidoId: null },
        ],
      });
    runTransactionCallbacks();
    prismaMock.compraGrupo.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app).post("/grupos/compras/c1/pagar").set(auth);

    expect(res.status).toBe(409);
    expect(prismaMock.compraGrupo.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", status: "PENDENTE", expiraEm: { lte: AGORA } },
      data: { status: "EXPIRADA" },
    });
    expect(prismaMock.pedido.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["p-u2"] } },
      data: { status: "CANCELADO" },
    });
    expect(prismaMock.participanteCompra.updateMany).toHaveBeenCalledWith({
      where: { compraGrupoId: "c1", status: "PAGO" },
      data: { status: "REEMBOLSADO" },
    });
    expect(prismaMock.lote.update).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { quantidadeVendida: { decrement: 1 }, quantidadeReservada: { decrement: 2 } },
    });
    expect(prismaMock.pedido.create).not.toHaveBeenCalled();
  });
});

describe("expiração ao consultar as compras", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.usuario.findUnique.mockResolvedValue({ id: "u1", papel: "CLIENTE" });
  });
  afterEach(() => vi.useRealTimers());

  it("GET / expira as compras vencidas e devolve a lista já atualizada", async () => {
    const auth = relogioFixo();
    const vencida = compra({ expiraEm: PASSADO });
    prismaMock.compraGrupo.findMany
      .mockResolvedValueOnce([vencida])
      .mockResolvedValueOnce([{ ...vencida, status: "EXPIRADA" }]);
    runTransactionCallbacks();
    prismaMock.compraGrupo.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.compraGrupo.findUnique.mockResolvedValue({ loteId: "l1", participantes: [] });

    const res = await request(app).get("/grupos/compras").set(auth);

    expect(res.status).toBe(200);
    expect(res.body[0].status).toBe("EXPIRADA");
    expect(prismaMock.compraGrupo.findMany).toHaveBeenCalledTimes(2);
  });

  it("compras dentro do prazo não são tocadas", async () => {
    const auth = relogioFixo();
    prismaMock.compraGrupo.findMany.mockResolvedValue([compra()]);

    const res = await request(app).get("/grupos/compras").set(auth);

    expect(res.status).toBe(200);
    expect(prismaMock.compraGrupo.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.compraGrupo.findMany).toHaveBeenCalledTimes(1);
  });

  it("expirar duas vezes em paralelo não duplica a devolução (updateMany sem linhas)", async () => {
    const auth = relogioFixo();
    prismaMock.compraGrupo.findMany.mockResolvedValue([compra({ expiraEm: PASSADO })]);
    runTransactionCallbacks();
    prismaMock.compraGrupo.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app).get("/grupos/compras").set(auth);

    expect(res.status).toBe(200);
    expect(prismaMock.lote.update).not.toHaveBeenCalled();
    expect(prismaMock.compraGrupo.findMany).toHaveBeenCalledTimes(1);
  });
});

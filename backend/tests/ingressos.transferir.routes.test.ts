import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock, runTransactionCallbacks } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const ingresso = { id: "i1", codigoQr: "GRV-ABCDEFGHJKLM", donoId: "u1", status: "VALIDO" };
const transferir = (corpo: unknown, id = "u1") =>
  request(app).post("/ingressos/i1/transferir").set(logadoComo("CLIENTE", id)).send(corpo as object);

describe("POST /ingressos/:id/transferir", () => {
  beforeEach(resetPrismaMock);

  it("sem token responde 401", async () => {
    const res = await request(app).post("/ingressos/i1/transferir").send({ username: "bia" });

    expect(res.status).toBe(401);
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ["sem corpo", undefined],
    ["sem username", {}],
    ["username vazio", { username: "  " }],
    ["username numérico", { username: 5 }],
  ])("%s responde 400", async (_nome, corpo) => {
    const res = await transferir(corpo);

    expect(res.status).toBe(400);
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
  });

  it("transfere: troca o dono e gera um código novo (aceita @ na frente)", async () => {
    prismaMock.ingresso.findUnique
      .mockResolvedValueOnce(ingresso)
      .mockResolvedValueOnce({ ...ingresso, donoId: "u2", codigoQr: "GRV-NOVOCODIGO00" });
    prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "u1", papel: "CLIENTE" }).mockResolvedValueOnce({ id: "u2" });
    runTransactionCallbacks();
    prismaMock.ingresso.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app).post("/ingressos/i1/transferir").set(logadoComo("CLIENTE", "u1")).send({ username: "@bia" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ donoId: "u2" });
    expect(prismaMock.usuario.findUnique.mock.calls[1][0].where).toEqual({ username: "bia" });
    const args = prismaMock.ingresso.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({ id: "i1", donoId: "u1", status: "VALIDO" });
    expect(args.data.donoId).toBe("u2");
    expect(args.data.codigoQr).toMatch(/^GRV-[A-HJ-NP-Z2-9]{12}$/);
    expect(args.data.codigoQr).not.toBe(ingresso.codigoQr);
  });

  it("ingresso de outra pessoa responde 404", async () => {
    prismaMock.ingresso.findUnique.mockResolvedValue({ ...ingresso, donoId: "u9" });

    const res = await transferir({ username: "bia" });

    expect(res.status).toBe(404);
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
  });

  it.each(["USADO", "CANCELADO"])("ingresso %s responde 409", async (status) => {
    prismaMock.ingresso.findUnique.mockResolvedValue({ ...ingresso, status });

    const res = await transferir({ username: "bia" });

    expect(res.status).toBe(409);
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
  });

  it("destinatário inexistente responde 404", async () => {
    prismaMock.ingresso.findUnique.mockResolvedValue(ingresso);
    prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "u1", papel: "CLIENTE" }).mockResolvedValueOnce(null);

    const res = await request(app).post("/ingressos/i1/transferir").set(logadoComo("CLIENTE", "u1")).send({ username: "ninguem" });

    expect(res.status).toBe(404);
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
  });

  it("transferir para si mesmo responde 400", async () => {
    prismaMock.ingresso.findUnique.mockResolvedValue(ingresso);
    prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "u1", papel: "CLIENTE" }).mockResolvedValueOnce({ id: "u1" });

    const res = await request(app).post("/ingressos/i1/transferir").set(logadoComo("CLIENTE", "u1")).send({ username: "eu" });

    expect(res.status).toBe(400);
  });

  it("perde a corrida (ingresso foi usado ou transferido no meio): 409", async () => {
    prismaMock.ingresso.findUnique.mockResolvedValue(ingresso);
    prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "u1", papel: "CLIENTE" }).mockResolvedValueOnce({ id: "u2" });
    runTransactionCallbacks();
    prismaMock.ingresso.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app).post("/ingressos/i1/transferir").set(logadoComo("CLIENTE", "u1")).send({ username: "bia" });

    expect(res.status).toBe(409);
  });
});

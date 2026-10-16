import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

describe("saúde da API", () => {
  beforeEach(resetPrismaMock);

  it("GET /health responde ok sem tocar no banco", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it("GET /health/db responde ok quando o banco está acessível", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const res = await request(app).get("/health/db");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "connected" });
  });

  it("GET /health/db responde 503 quando o banco falha", async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error("sem conexão"));

    const res = await request(app).get("/health/db");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "error", database: "disconnected" });
  });

  it("rota inexistente responde 404", async () => {
    const res = await request(app).get("/nao-existe");

    expect(res.status).toBe(404);
  });
});

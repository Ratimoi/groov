import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock, runTransactionCallbacks } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const resetar = (papel: "ADMIN" | "PRODUTOR" | "CLIENTE" = "ADMIN") =>
  request(app).post("/admin/resetar-seed").set(logadoComo(papel, "adm"));

describe("POST /admin/resetar-seed", () => {
  beforeEach(() => {
    resetPrismaMock();
    runTransactionCallbacks();
    vi.stubEnv("SEED_PASSWORD", "senha-do-seed-1");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sem token responde 401", async () => {
    const res = await request(app).post("/admin/resetar-seed");

    expect(res.status).toBe(401);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it.each(["CLIENTE", "PRODUTOR"] as const)("%s recebe 403 e nada é apagado", async (papel) => {
    const res = await resetar(papel);

    expect(res.status).toBe(403);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("em produção responde 403 e nada é apagado", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const res = await resetar();

    expect(res.status).toBe(403);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("sem SEED_PASSWORD responde 500 e nada é apagado", async () => {
    vi.stubEnv("SEED_PASSWORD", "");

    const res = await resetar();

    expect(res.status).toBe(500);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("ADMIN apaga tudo menos a própria conta e recria o seed", async () => {
    const res = await resetar();

    expect(res.status).toBe(200);
    expect(prismaMock.usuario.deleteMany).toHaveBeenCalledWith({ where: { id: { not: "adm" } } });
    expect(prismaMock.ingresso.deleteMany).toHaveBeenCalled();
    expect(prismaMock.evento.deleteMany).toHaveBeenCalled();
    expect(prismaMock.evento.createMany).toHaveBeenCalled();
    expect(prismaMock.lote.createMany).toHaveBeenCalled();
    expect(prismaMock.usuario.createMany).toHaveBeenCalledTimes(2);
  });
});

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const ingresso = { id: "i1", codigoQr: "GRV-ABCDEFGHJKLM", donoId: "u1", status: "VALIDO" };

describe("/ingressos", () => {
  beforeEach(resetPrismaMock);

  it.each(["/ingressos", "/ingressos/i1"])("GET %s sem token responde 401", async (rota) => {
    const res = await request(app).get(rota);

    expect(res.status).toBe(401);
    expect(prismaMock.ingresso.findMany).not.toHaveBeenCalled();
    expect(prismaMock.ingresso.findUnique).not.toHaveBeenCalled();
  });

  describe("GET /", () => {
    it("lista só os ingressos do usuário logado, sem dados sensíveis do dono", async () => {
      prismaMock.ingresso.findMany.mockResolvedValue([ingresso]);

      const res = await request(app).get("/ingressos").set(logadoComo("CLIENTE", "u1"));

      expect(res.status).toBe(200);
      expect(res.body).toEqual([ingresso]);
      const args = prismaMock.ingresso.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ donoId: "u1" });
      expect(Object.keys(args.include.dono.select).sort()).toEqual(["id", "nome", "username"]);
    });

    it("ADMIN também vê só os próprios ingressos", async () => {
      prismaMock.ingresso.findMany.mockResolvedValue([]);

      await request(app).get("/ingressos").set(logadoComo("ADMIN", "adm"));

      expect(prismaMock.ingresso.findMany.mock.calls[0][0].where).toEqual({ donoId: "adm" });
    });
  });

  describe("GET /:id", () => {
    it("o dono vê o ingresso", async () => {
      prismaMock.ingresso.findUnique.mockResolvedValue(ingresso);

      const res = await request(app).get("/ingressos/i1").set(logadoComo("CLIENTE", "u1"));

      expect(res.status).toBe(200);
      expect(res.body.codigoQr).toBe("GRV-ABCDEFGHJKLM");
    });

    it("ingresso de outra pessoa responde 404 (nem o ADMIN vê o código)", async () => {
      prismaMock.ingresso.findUnique.mockResolvedValue(ingresso);

      const comum = await request(app).get("/ingressos/i1").set(logadoComo("CLIENTE", "u2"));
      const admin = await request(app).get("/ingressos/i1").set(logadoComo("ADMIN", "adm"));

      expect(comum.status).toBe(404);
      expect(admin.status).toBe(404);
    });

    it("ingresso inexistente responde 404", async () => {
      prismaMock.ingresso.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/ingressos/nada").set(logadoComo());

      expect(res.status).toBe(404);
    });
  });
});

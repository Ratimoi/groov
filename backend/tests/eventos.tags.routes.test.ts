import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const valido = { titulo: "Festival", cidade: "Olinda", comecaEm: "2026-12-10T20:00:00Z" };
const salvo = { id: "e1", titulo: "Show", cidade: "Recife", comecaEm: new Date("2026-12-01T22:00:00Z"), terminaEm: null, criadoPorId: "p1" };

describe("tags dos eventos", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.evento.create.mockImplementation(async ({ data }) => ({ id: "novo", ...data }));
    prismaMock.evento.findUnique.mockResolvedValue(salvo);
    prismaMock.evento.update.mockImplementation(async ({ data }) => ({ ...salvo, ...data }));
  });

  it("POST grava as tags sem espaços sobrando e sem repetição (maiúsculas não contam)", async () => {
    const res = await request(app)
      .post("/eventos")
      .set(logadoComo("PRODUTOR", "p1"))
      .send({ ...valido, tags: [" 18+ ", "Open Bar", "open bar", "18+"] });

    expect(res.status).toBe(201);
    expect(prismaMock.evento.create.mock.calls[0][0].data.tags).toEqual(["18+", "Open Bar"]);
  });

  it("PUT troca as tags e [] limpa", async () => {
    const res = await request(app).put("/eventos/e1").set(logadoComo("PRODUTOR", "p1")).send({ tags: [] });

    expect(res.status).toBe(200);
    expect(prismaMock.evento.update.mock.calls[0][0].data).toEqual({ tags: [] });
  });

  it.each([
    ["que não é lista", "18+"],
    ["com item que não é texto", [18]],
    ["com item vazio", ["  "]],
    ["com item longo demais", ["a".repeat(25)]],
    ["com mais de 8 itens", Array.from({ length: 9 }, (_, i) => `t${i}`)],
  ])("tags %s responde 400 e não grava", async (_nome, tags) => {
    const res = await request(app).post("/eventos").set(logadoComo("PRODUTOR", "p1")).send({ ...valido, tags });

    expect(res.status).toBe(400);
    expect(prismaMock.evento.create).not.toHaveBeenCalled();
  });
});

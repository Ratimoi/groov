import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

describe("GET /categorias", () => {
  beforeEach(resetPrismaMock);

  it("é público e lista as categorias em ordem de nome", async () => {
    const categorias = [{ id: "c1", nome: "Culturais" }, { id: "c2", nome: "Festas" }];
    prismaMock.categoria.findMany.mockResolvedValue(categorias);

    const res = await request(app).get("/categorias");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(categorias);
    expect(prismaMock.categoria.findMany).toHaveBeenCalledWith({ orderBy: { nome: "asc" } });
  });

  it("sem categorias devolve lista vazia", async () => {
    prismaMock.categoria.findMany.mockResolvedValue([]);

    const res = await request(app).get("/categorias");

    expect(res.body).toEqual([]);
  });
});

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { haversineKm } from "../src/utils/eventFilters";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const evento = (id: string, latitude: number, longitude: number, comecaEm = "2026-12-01T20:00:00Z") => ({
  id,
  titulo: id,
  latitude,
  longitude,
  comecaEm: new Date(comecaEm),
});

describe("GET /eventos com filtros", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.evento.findMany.mockResolvedValue([]);
    prismaMock.evento.count.mockResolvedValue(0);
  });

  const whereUsado = () => prismaMock.evento.findMany.mock.calls[0][0].where;

  it("busca por texto procura em título, descrição, local, cidade e tags", async () => {
    const res = await request(app).get("/eventos?q=Rock");

    expect(res.status).toBe(200);
    const or = whereUsado().AND[0].OR;
    expect(or).toHaveLength(5);
    expect(or[0]).toEqual({ titulo: { contains: "Rock", mode: "insensitive" } });
    expect(or[4]).toEqual({ tags: { has: "rock" } });
    expect(whereUsado().ocultoEm).toBeNull();
  });

  it("filtra por categoria, cidade, tag, datas e preço", async () => {
    await request(app).get("/eventos?categoria=Show&cidade=Recife&tag=18%2B&de=2026-12-01&ate=2026-12-31&precoMax=80");

    const w = whereUsado();
    expect(w.categoria).toEqual({ nome: { equals: "Show", mode: "insensitive" } });
    expect(w.cidade).toEqual({ equals: "Recife", mode: "insensitive" });
    expect(w.tags).toEqual({ has: "18+" });
    expect(w.comecaEm.gte).toEqual(new Date("2026-12-01"));
    expect(w.comecaEm.lte).toEqual(new Date("2026-12-31"));
    expect(w.AND).toEqual([{ lotes: { some: { preco: { lte: 80 } } } }]);
  });

  it("gratis procura lote de preço zero", async () => {
    await request(app).get("/eventos?gratis=true");

    expect(whereUsado().AND).toEqual([{ lotes: { some: { preco: 0 } } }]);
  });

  it("perto de mim: filtra pela caixa, ordena por distância e informa distanciaKm", async () => {
    // Centro em Recife. e-longe fica em Olinda (~7 km), e-fora em Natal (~250 km), e-perto no mesmo ponto.
    prismaMock.evento.findMany.mockResolvedValue([
      evento("e-longe", -8.0089, -34.8553),
      evento("e-fora", -5.7945, -35.211),
      evento("e-perto", -8.0476, -34.877),
    ]);

    const res = await request(app).get("/eventos?latitude=-8.0476&longitude=-34.877&raioKm=30");

    expect(res.status).toBe(200);
    expect(res.body.data.map((e: { id: string }) => e.id)).toEqual(["e-perto", "e-longe"]);
    expect(res.body.data[0].distanciaKm).toBe(0);
    expect(res.body.data[1].distanciaKm).toBeGreaterThan(3);
    expect(res.body.total).toBe(2);
    expect(whereUsado().latitude).toMatchObject({ gte: expect.any(Number), lte: expect.any(Number) });
    expect(prismaMock.evento.count).not.toHaveBeenCalled();
  });

  it("perto de mim usa raio padrão de 25 km e pagina o resultado", async () => {
    prismaMock.evento.findMany.mockResolvedValue([evento("a", -8.0476, -34.877), evento("b", -8.05, -34.88), evento("c", -8.06, -34.9)]);

    const res = await request(app).get("/eventos?latitude=-8.0476&longitude=-34.877&limit=2&page=2");

    expect(res.body.data.map((e: { id: string }) => e.id)).toEqual(["c"]);
    expect(res.body.total).toBe(3);
  });

  it.each([
    "?latitude=-8",
    "?longitude=-34",
    "?raioKm=10",
    "?latitude=95&longitude=0",
    "?latitude=0&longitude=0&raioKm=9999",
    "?de=ontem",
    "?de=2026-12-31&ate=2026-12-01",
    "?precoMax=barato",
    "?gratis=talvez",
  ])("rejeita filtro inválido %s", async (qs) => {
    expect((await request(app).get(`/eventos${qs}`)).status).toBe(400);
  });
});

describe("haversineKm", () => {
  it("calcula a distância entre Recife e Natal em cerca de 250 km", () => {
    expect(haversineKm(-8.0476, -34.877, -5.7945, -35.211)).toBeGreaterThan(245);
    expect(haversineKm(-8.0476, -34.877, -5.7945, -35.211)).toBeLessThan(260);
  });

  it("é zero para o mesmo ponto", () => {
    expect(haversineKm(10, 20, 10, 20)).toBe(0);
  });
});

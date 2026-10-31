import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const organizador = { id: "p1", nome: "Produtora", username: "prod", avatarUrl: null };
const evento = { id: "e1", criadoPorId: "p1", criadoPor: organizador };

describe("GET /eventos/:id/avaliacoes", () => {
  beforeEach(resetPrismaMock);

  it("é público e devolve a média do evento e a do organizador (1 casa decimal)", async () => {
    prismaMock.evento.findUnique.mockResolvedValue(evento);
    prismaMock.avaliacaoEvento.aggregate
      .mockResolvedValueOnce({ _avg: { nota: 4.26 }, _count: 3 })
      .mockResolvedValueOnce({ _avg: { nota: 3.94 }, _count: 10 });

    const res = await request(app).get("/eventos/e1/avaliacoes");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      evento: { media: 4.3, total: 3 },
      organizador: { ...organizador, media: 3.9, total: 10 },
    });
    expect(prismaMock.avaliacaoEvento.aggregate.mock.calls[1][0].where).toEqual({ evento: { criadoPorId: "p1" } });
  });

  it("sem avaliações a média é null, não zero", async () => {
    prismaMock.evento.findUnique.mockResolvedValue(evento);
    prismaMock.avaliacaoEvento.aggregate.mockResolvedValue({ _avg: { nota: null }, _count: 0 });

    const res = await request(app).get("/eventos/e1/avaliacoes");

    expect(res.body.evento).toEqual({ media: null, total: 0 });
  });

  it("evento sem criador não tem organizador", async () => {
    prismaMock.evento.findUnique.mockResolvedValue({ id: "e1", criadoPorId: null, criadoPor: null });
    prismaMock.avaliacaoEvento.aggregate.mockResolvedValue({ _avg: { nota: 5 }, _count: 1 });

    const res = await request(app).get("/eventos/e1/avaliacoes");

    expect(res.body.organizador).toBeNull();
    expect(prismaMock.avaliacaoEvento.aggregate).toHaveBeenCalledTimes(1);
  });

  it("evento inexistente responde 404", async () => {
    prismaMock.evento.findUnique.mockResolvedValue(null);

    expect((await request(app).get("/eventos/x/avaliacoes")).status).toBe(404);
  });
});

describe("POST /eventos/:id/avaliacoes", () => {
  beforeEach(resetPrismaMock);

  const avaliar = (corpo: unknown, id = "c1") =>
    request(app).post("/eventos/e1/avaliacoes").set(logadoComo("CLIENTE", id)).send(corpo as object);

  it("sem token responde 401", async () => {
    const res = await request(app).post("/eventos/e1/avaliacoes").send({ nota: 5 });

    expect(res.status).toBe(401);
    expect(prismaMock.avaliacaoEvento.upsert).not.toHaveBeenCalled();
  });

  it.each([
    ["sem corpo", undefined],
    ["sem nota", {}],
    ["nota zero", { nota: 0 }],
    ["nota seis", { nota: 6 }],
    ["nota fracionada", { nota: 4.5 }],
    ["nota em texto", { nota: "5" }],
    ["comentário que não é texto", { nota: 5, comentario: 1 }],
    ["comentário gigante", { nota: 5, comentario: "x".repeat(501) }],
  ])("%s responde 400", async (_nome, corpo) => {
    const res = await avaliar(corpo);

    expect(res.status).toBe(400);
    expect(prismaMock.avaliacaoEvento.upsert).not.toHaveBeenCalled();
  });

  it("quem foi ao evento (ingresso USADO) avalia; avaliar de novo substitui a nota", async () => {
    prismaMock.evento.findUnique.mockResolvedValue(evento);
    prismaMock.ingresso.count.mockResolvedValue(1);
    prismaMock.avaliacaoEvento.upsert.mockImplementation(async ({ create }) => ({ id: "a1", ...create }));

    const res = await avaliar({ nota: 5, comentario: "  Foi incrível  " });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ eventoId: "e1", usuarioId: "c1", nota: 5, comentario: "Foi incrível" });
    expect(prismaMock.ingresso.count.mock.calls[0][0].where).toEqual({ eventoId: "e1", donoId: "c1", status: "USADO" });
    const args = prismaMock.avaliacaoEvento.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ eventoId_usuarioId: { eventoId: "e1", usuarioId: "c1" } });
    expect(args.update).toEqual({ nota: 5, comentario: "Foi incrível" });
  });

  it("comentário vazio é gravado como null", async () => {
    prismaMock.evento.findUnique.mockResolvedValue(evento);
    prismaMock.ingresso.count.mockResolvedValue(1);
    prismaMock.avaliacaoEvento.upsert.mockImplementation(async ({ create }) => ({ id: "a1", ...create }));

    await avaliar({ nota: 4, comentario: "   " });

    expect(prismaMock.avaliacaoEvento.upsert.mock.calls[0][0].create.comentario).toBeNull();
  });

  it("quem não foi ao evento (sem ingresso USADO) recebe 403", async () => {
    prismaMock.evento.findUnique.mockResolvedValue(evento);
    prismaMock.ingresso.count.mockResolvedValue(0);

    const res = await avaliar({ nota: 5 });

    expect(res.status).toBe(403);
    expect(prismaMock.avaliacaoEvento.upsert).not.toHaveBeenCalled();
  });

  it("o próprio organizador não avalia o evento dele (403)", async () => {
    prismaMock.evento.findUnique.mockResolvedValue(evento);

    const res = await avaliar({ nota: 5 }, "p1");

    expect(res.status).toBe(403);
    expect(prismaMock.ingresso.count).not.toHaveBeenCalled();
  });

  it("evento inexistente responde 404", async () => {
    prismaMock.evento.findUnique.mockResolvedValue(null);

    expect((await avaliar({ nota: 5 })).status).toBe(404);
  });
});

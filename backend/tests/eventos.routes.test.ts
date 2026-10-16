import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const evento = { id: "e1", titulo: "Show", cidade: "Recife" };

describe("/eventos", () => {
  beforeEach(resetPrismaMock);

  it("GET lista os eventos", async () => {
    prismaMock.evento.findMany.mockResolvedValue([evento]);

    const res = await request(app).get("/eventos");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([evento]);
  });

  it("GET /:id devolve o evento", async () => {
    prismaMock.evento.findUnique.mockResolvedValue(evento);

    const res = await request(app).get("/eventos/e1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(evento);
    expect(prismaMock.evento.findUnique).toHaveBeenCalledWith({ where: { id: "e1" } });
  });

  it("GET /:id inexistente responde 404 com mensagem de evento", async () => {
    prismaMock.evento.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/eventos/nada");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Event not found" });
  });

  it("erro inesperado no banco responde 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.evento.findMany.mockRejectedValue(new Error("falhou"));

    const res = await request(app).get("/eventos");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Erro interno do servidor" });
  });
});

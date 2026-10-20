import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const evento = { id: "e1", titulo: "Show", cidade: "Recife" };

describe("/eventos", () => {
  beforeEach(resetPrismaMock);

  describe("GET (listagem paginada)", () => {
    function listaDe(total: number, eventos = [evento]) {
      prismaMock.evento.findMany.mockResolvedValue(eventos);
      prismaMock.evento.count.mockResolvedValue(total);
    }

    it("sem parâmetros usa page=1 e limit=20 e devolve o envelope de paginação", async () => {
      listaDe(1);

      const res = await request(app).get("/eventos");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: [evento], page: 1, limit: 20, total: 1, totalPages: 1 });
      expect(prismaMock.evento.findMany).toHaveBeenCalledWith({
        orderBy: [{ comecaEm: "asc" }, { id: "asc" }],
        skip: 0,
        take: 20,
      });
    });

    it("page e limit calculam skip e take", async () => {
      listaDe(95);

      const res = await request(app).get("/eventos?page=3&limit=10");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ page: 3, limit: 10, total: 95, totalPages: 10 });
      expect(prismaMock.evento.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }));
    });

    it("ordena de forma estável (data de início, depois id) para as páginas não se repetirem", async () => {
      listaDe(1);

      await request(app).get("/eventos");

      expect(prismaMock.evento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ comecaEm: "asc" }, { id: "asc" }] }),
      );
    });

    it("aceita limit no máximo permitido (100)", async () => {
      listaDe(1);

      const res = await request(app).get("/eventos?limit=100");

      expect(res.status).toBe(200);
      expect(prismaMock.evento.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    });

    it("página além da última devolve data vazio mas mantém o total", async () => {
      listaDe(5, []);

      const res = await request(app).get("/eventos?page=9&limit=10");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: [], page: 9, limit: 10, total: 5, totalPages: 1 });
    });

    it("sem eventos devolve totalPages 0", async () => {
      listaDe(0, []);

      const res = await request(app).get("/eventos");

      expect(res.body).toMatchObject({ data: [], total: 0, totalPages: 0 });
    });

    it.each([
      ["page=0", "page deve ser um inteiro maior ou igual a 1"],
      ["page=-1", "page deve ser um inteiro maior ou igual a 1"],
      ["page=abc", "page deve ser um inteiro maior ou igual a 1"],
      ["page=1.5", "page deve ser um inteiro maior ou igual a 1"],
      ["page=1e2", "page deve ser um inteiro maior ou igual a 1"],
      ["page=", "page deve ser um inteiro maior ou igual a 1"],
      ["page=1&page=2", "page deve ser um inteiro maior ou igual a 1"],
      ["limit=0", "limit deve ser um inteiro maior ou igual a 1"],
      ["limit=abc", "limit deve ser um inteiro maior ou igual a 1"],
      ["limit=101", "limit deve ser no máximo 100"],
      ["page=99999999999", "page fora do intervalo permitido"],
    ])("parâmetros inválidos (%s) respondem 400 sem consultar o banco", async (query, mensagem) => {
      const res = await request(app).get(`/eventos?${query}`);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: mensagem });
      expect(prismaMock.evento.findMany).not.toHaveBeenCalled();
    });
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
    prismaMock.evento.count.mockResolvedValue(0);

    const res = await request(app).get("/eventos");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Erro interno do servidor" });
  });
});

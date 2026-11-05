import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const evento = { id: "e1", titulo: "Festival", criadoPorId: "g1", ocultoEm: null };
const gerente = () => logadoComo("CLIENTE", "g1");

describe("/eventos/:id/equipe", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.evento.findUnique.mockResolvedValue(evento);
  });

  describe("GET", () => {
    it("o gerente lista a equipe", async () => {
      const auth = gerente();
      prismaMock.eventoMembro.findMany.mockResolvedValue([{ id: "m1", usuarioId: "u2", cargo: "VALIDADOR" }]);
      prismaMock.pedido.groupBy.mockResolvedValue([]);

      const res = await request(app).get("/eventos/e1/equipe").set(auth);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: "m1", usuarioId: "u2", cargo: "VALIDADOR", vendas: { pedidos: 0, ingressos: 0, comissao: "0.00" } }]);
    });

    it("quem não é o gerente recebe 403 (inclusive ADMIN)", async () => {
      const auth = logadoComo("ADMIN", "adm");

      const res = await request(app).get("/eventos/e1/equipe").set(auth);

      expect(res.status).toBe(403);
      expect(prismaMock.eventoMembro.findMany).not.toHaveBeenCalled();
    });

    it("sem token responde 401", async () => {
      expect((await request(app).get("/eventos/e1/equipe")).status).toBe(401);
    });

    it("evento inexistente responde 404", async () => {
      const auth = gerente();
      prismaMock.evento.findUnique.mockResolvedValue(null);

      expect((await request(app).get("/eventos/nada/equipe").set(auth)).status).toBe(404);
    });
  });

  describe("POST", () => {
    beforeEach(() => {
      prismaMock.eventoMembro.upsert.mockImplementation(async ({ create }) => ({ id: "m1", ...create }));
    });

    it("o gerente adiciona alguém pelo username com um cargo", async () => {
      const auth = gerente();
      prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "g1", papel: "CLIENTE" }).mockResolvedValueOnce({ id: "u2" });

      const res = await request(app).post("/eventos/e1/equipe").set(auth).send({ username: "@ana", cargo: "PROMOTOR" });

      expect(res.status).toBe(201);
      expect(prismaMock.usuario.findUnique.mock.calls[1][0].where).toEqual({ username: "ana" });
      expect(prismaMock.eventoMembro.upsert.mock.calls[0][0].create).toEqual({
        eventoId: "e1",
        usuarioId: "u2",
        cargo: "PROMOTOR",
        codigoAfiliado: expect.stringMatching(/^[A-Z2-9]{8}$/),
      });
    });

    it.each([["GERENTE"], ["ADMIN"], [undefined], [1]])("cargo %s é recusado", async (cargo) => {
      const auth = gerente();

      const res = await request(app).post("/eventos/e1/equipe").set(auth).send({ username: "ana", cargo });

      expect(res.status).toBe(400);
      expect(prismaMock.eventoMembro.upsert).not.toHaveBeenCalled();
    });

    it("username inexistente responde 404", async () => {
      const auth = gerente();
      prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "g1", papel: "CLIENTE" }).mockResolvedValueOnce(null);

      const res = await request(app).post("/eventos/e1/equipe").set(auth).send({ username: "ninguem", cargo: "VALIDADOR" });

      expect(res.status).toBe(404);
    });

    it("não adiciona o próprio gerente", async () => {
      const auth = gerente();
      prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "g1", papel: "CLIENTE" }).mockResolvedValueOnce({ id: "g1" });

      const res = await request(app).post("/eventos/e1/equipe").set(auth).send({ username: "eu", cargo: "VALIDADOR" });

      expect(res.status).toBe(400);
      expect(prismaMock.eventoMembro.upsert).not.toHaveBeenCalled();
    });

    it("quem não é o gerente recebe 403", async () => {
      const auth = logadoComo("CLIENTE", "outro");

      const res = await request(app).post("/eventos/e1/equipe").set(auth).send({ username: "ana", cargo: "VALIDADOR" });

      expect(res.status).toBe(403);
      expect(prismaMock.eventoMembro.upsert).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /:usuarioId", () => {
    it("o gerente remove um membro", async () => {
      const auth = gerente();
      prismaMock.eventoMembro.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app).delete("/eventos/e1/equipe/u2").set(auth);

      expect(res.status).toBe(204);
      expect(prismaMock.eventoMembro.deleteMany).toHaveBeenCalledWith({ where: { eventoId: "e1", usuarioId: "u2" } });
    });

    it("membro inexistente responde 404", async () => {
      const auth = gerente();
      prismaMock.eventoMembro.deleteMany.mockResolvedValue({ count: 0 });

      expect((await request(app).delete("/eventos/e1/equipe/u2").set(auth)).status).toBe(404);
    });

    it("quem não é o gerente recebe 403", async () => {
      const auth = logadoComo("CLIENTE", "outro");

      const res = await request(app).delete("/eventos/e1/equipe/u2").set(auth);

      expect(res.status).toBe(403);
      expect(prismaMock.eventoMembro.deleteMany).not.toHaveBeenCalled();
    });
  });
});

describe("GET /eventos/meus", () => {
  beforeEach(resetPrismaMock);

  it("junta os eventos que a pessoa gerencia e os em que está na equipe, com o cargo", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    prismaMock.evento.findMany.mockResolvedValue([{ id: "e1", titulo: "Meu" }]);
    prismaMock.eventoMembro.findMany.mockResolvedValue([{ cargo: "PROMOTOR", evento: { id: "e2", titulo: "Dos outros" } }]);

    const res = await request(app).get("/eventos/meus").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { cargo: "GERENTE", evento: { id: "e1", titulo: "Meu" } },
      { cargo: "PROMOTOR", evento: { id: "e2", titulo: "Dos outros" } },
    ]);
  });

  it("sem token responde 401", async () => {
    expect((await request(app).get("/eventos/meus")).status).toBe(401);
  });
});

describe("eventos ocultos pela moderação", () => {
  beforeEach(resetPrismaMock);

  it("GET /eventos/:id responde 404 para evento oculto", async () => {
    prismaMock.evento.findUnique.mockResolvedValue({ id: "e1", ocultoEm: new Date() });

    expect((await request(app).get("/eventos/e1")).status).toBe(404);
  });

  it("ADMIN oculta com motivo", async () => {
    const auth = logadoComo("ADMIN", "adm");
    prismaMock.evento.findUnique.mockResolvedValue({ id: "e1" });
    prismaMock.evento.update.mockResolvedValue({ id: "e1", titulo: "X", ocultoEm: new Date(), ocultoMotivo: "spam" });

    const res = await request(app).post("/admin/eventos/e1/ocultar").set(auth).send({ motivo: "spam" });

    expect(res.status).toBe(200);
    expect(prismaMock.evento.update.mock.calls[0][0].data).toMatchObject({ ocultoMotivo: "spam", ocultoEm: expect.any(Date) });
  });

  it("ocultar exige motivo", async () => {
    const auth = logadoComo("ADMIN", "adm");

    const res = await request(app).post("/admin/eventos/e1/ocultar").set(auth).send({});

    expect(res.status).toBe(400);
    expect(prismaMock.evento.update).not.toHaveBeenCalled();
  });

  it("ADMIN reexibe", async () => {
    const auth = logadoComo("ADMIN", "adm");
    prismaMock.evento.findUnique.mockResolvedValue({ id: "e1" });
    prismaMock.evento.update.mockResolvedValue({ id: "e1", ocultoEm: null, ocultoMotivo: null });

    const res = await request(app).post("/admin/eventos/e1/reexibir").set(auth);

    expect(res.status).toBe(200);
    expect(prismaMock.evento.update.mock.calls[0][0].data).toEqual({ ocultoEm: null, ocultoMotivo: null });
  });

  it("ADMIN lista os ocultos", async () => {
    const auth = logadoComo("ADMIN", "adm");
    prismaMock.evento.findMany.mockResolvedValue([{ id: "e1" }]);

    const res = await request(app).get("/admin/eventos/ocultos").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "e1" }]);
  });

  it.each([
    ["post", "/admin/eventos/e1/ocultar"],
    ["post", "/admin/eventos/e1/reexibir"],
    ["get", "/admin/eventos/ocultos"],
  ] as const)("CLIENTE recebe 403 em %s %s", async (metodo, caminho) => {
    const auth = logadoComo("CLIENTE", "c1");

    const res = await request(app)[metodo](caminho).set(auth).send({ motivo: "x" });

    expect(res.status).toBe(403);
    expect(prismaMock.evento.update).not.toHaveBeenCalled();
  });
});

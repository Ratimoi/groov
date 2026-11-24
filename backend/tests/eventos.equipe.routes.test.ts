import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo, logadoUmaVezComo } from "./helpers/auth";
import { programaEquipe } from "./helpers/equipe";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const evento = { id: "e1", titulo: "Show", cidade: "Recife", criadoPorId: "dono" };
const equipe = [
  { usuarioId: "dono", funcao: "DONO", usuario: { id: "dono", nome: "Dona", username: "dona", avatarUrl: null } },
  { usuarioId: "u5", funcao: "PORTEIRO", usuario: { id: "u5", nome: "Pedro", username: "pedro", avatarUrl: null } },
];

describe("equipe do evento", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.evento.findUnique.mockResolvedValue(evento);
    programaEquipe({ dono: "DONO", produtor: "PRODUTOR", porteiro: "PORTEIRO" });
    prismaMock.membroEvento.findMany.mockResolvedValue(equipe);
  });

  describe("GET /eventos/meus", () => {
    it("sem token responde 401", async () => {
      expect((await request(app).get("/eventos/meus")).status).toBe(401);
    });

    it("lista só os eventos em que a pessoa tem função, com a função", async () => {
      const dados = [{ funcao: "PORTEIRO", evento: { id: "e1", titulo: "Show" } }];
      prismaMock.membroEvento.findMany.mockResolvedValue(dados);

      const res = await request(app).get("/eventos/meus").set(logadoComo("porteiro"));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(dados);
      expect(prismaMock.membroEvento.findMany.mock.calls[0][0].where).toEqual({ usuarioId: "porteiro" });
    });
  });

  describe("GET /eventos/:eventoId/equipe", () => {
    it("o dono vê a equipe", async () => {
      const res = await request(app).get("/eventos/e1/equipe").set(logadoComo("dono"));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(equipe);
    });

    it.each(["produtor", "porteiro", "estranho"])("%s recebe 403: só o dono gerencia a equipe", async (quem) => {
      const res = await request(app).get("/eventos/e1/equipe").set(logadoComo(quem));

      expect(res.status).toBe(403);
      expect(prismaMock.membroEvento.findMany).not.toHaveBeenCalled();
    });

    it("evento inexistente responde 404", async () => {
      prismaMock.evento.findUnique.mockResolvedValue(null);

      expect((await request(app).get("/eventos/nada/equipe").set(logadoComo("dono"))).status).toBe(404);
    });
  });

  describe("POST /eventos/:eventoId/equipe", () => {
    beforeEach(() => {
      prismaMock.usuario.findUnique.mockImplementation(async ({ where }: { where: { id?: string; username?: string } }) =>
        where.id ? { id: where.id, podeResetarSeed: false } : where.username === "pedro" ? { id: "u5" } : null,
      );
      prismaMock.membroEvento.upsert.mockResolvedValue({});
    });

    const adicionar = (corpo: unknown, quem = "dono") =>
      request(app).post("/eventos/e1/equipe").set(logadoUmaVezComo(quem)).send(corpo as object);

    it.each(["PRODUTOR", "PORTEIRO"])("o dono põe alguém como %s (aceita @ e espaços)", async (funcao) => {
      const res = await adicionar({ username: " @pedro ", funcao });

      expect(res.status).toBe(200);
      expect(prismaMock.membroEvento.upsert).toHaveBeenCalledWith({
        where: { eventoId_usuarioId: { eventoId: "e1", usuarioId: "u5" } },
        create: { eventoId: "e1", usuarioId: "u5", funcao },
        update: { funcao },
      });
      expect(res.body).toEqual(equipe);
    });

    it.each(["produtor", "porteiro", "estranho"])("%s recebe 403 e nada é gravado", async (quem) => {
      const res = await adicionar({ username: "pedro", funcao: "PORTEIRO" }, quem);

      expect(res.status).toBe(403);
      expect(prismaMock.membroEvento.upsert).not.toHaveBeenCalled();
    });

    it.each([
      ["sem username", { funcao: "PORTEIRO" }],
      ["username vazio", { username: " ", funcao: "PORTEIRO" }],
      ["sem funcao", { username: "pedro" }],
      ["funcao DONO (só nasce com o evento)", { username: "pedro", funcao: "DONO" }],
      ["funcao inexistente", { username: "pedro", funcao: "ADMIN" }],
    ])("%s responde 400", async (_nome, corpo) => {
      const res = await adicionar(corpo);

      expect(res.status).toBe(400);
      expect(prismaMock.membroEvento.upsert).not.toHaveBeenCalled();
    });

    it("usuário inexistente responde 404", async () => {
      const res = await adicionar({ username: "ninguem", funcao: "PORTEIRO" });

      expect(res.status).toBe(404);
      expect(prismaMock.membroEvento.upsert).not.toHaveBeenCalled();
    });

    it("o dono não pode ser rebaixado por si mesmo nem por ninguém (409)", async () => {
      programaEquipe({ dono: "DONO", u5: "DONO" });

      const res = await adicionar({ username: "pedro", funcao: "PORTEIRO" });

      expect(res.status).toBe(409);
      expect(prismaMock.membroEvento.upsert).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /eventos/:eventoId/equipe/:usuarioId", () => {
    it("o dono remove alguém da equipe (204)", async () => {
      programaEquipe({ dono: "DONO", u5: "PORTEIRO" });
      prismaMock.membroEvento.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app).delete("/eventos/e1/equipe/u5").set(logadoComo("dono"));

      expect(res.status).toBe(204);
      expect(prismaMock.membroEvento.deleteMany).toHaveBeenCalledWith({ where: { eventoId: "e1", usuarioId: "u5" } });
    });

    it.each(["produtor", "porteiro", "estranho"])("%s recebe 403", async (quem) => {
      const res = await request(app).delete("/eventos/e1/equipe/u5").set(logadoComo(quem));

      expect(res.status).toBe(403);
      expect(prismaMock.membroEvento.deleteMany).not.toHaveBeenCalled();
    });

    it("o dono não pode ser removido (409)", async () => {
      const res = await request(app).delete("/eventos/e1/equipe/dono").set(logadoComo("dono"));

      expect(res.status).toBe(409);
      expect(prismaMock.membroEvento.deleteMany).not.toHaveBeenCalled();
    });

    it("quem não está na equipe responde 404", async () => {
      prismaMock.membroEvento.deleteMany.mockResolvedValue({ count: 0 });

      const res = await request(app).delete("/eventos/e1/equipe/u9").set(logadoComo("dono"));

      expect(res.status).toBe(404);
    });
  });
});

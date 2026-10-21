import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaError } from "./helpers/prismaErrors";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

// p1 é o produtor que criou o evento salvo; p2 é outro produtor.
const salvo = {
  id: "e1",
  titulo: "Show",
  cidade: "Recife",
  comecaEm: new Date("2026-12-01T22:00:00.000Z"),
  terminaEm: new Date("2026-12-02T02:00:00.000Z"),
  criadoPorId: "p1",
};
const valido = { titulo: "Festival", cidade: "Olinda", comecaEm: "2026-12-10T20:00:00Z" };

const criador = () => logadoComo("PRODUTOR", "p1");
const outroProdutor = () => logadoComo("PRODUTOR", "p2");
const admin = () => logadoComo("ADMIN", "adm");
const cliente = () => logadoComo("CLIENTE", "c1");

const FORMATO_DATA = "deve ser uma data ISO 8601 (ex.: 2026-12-31T22:00:00Z)";

describe("/eventos (escrita)", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.evento.findUnique.mockResolvedValue(salvo);
  });

  describe("POST", () => {
    beforeEach(() => {
      prismaMock.evento.create.mockImplementation(async ({ data }) => ({ id: "novo", ...data }));
    });

    it("PRODUTOR cria; o criador é o usuário logado e as datas viram Date", async () => {
      const res = await request(app).post("/eventos").set(criador()).send(valido);

      expect(res.status).toBe(201);
      expect(prismaMock.evento.create).toHaveBeenCalledWith({
        data: { titulo: "Festival", cidade: "Olinda", comecaEm: new Date("2026-12-10T20:00:00Z"), criadoPorId: "p1" },
      });
      expect(res.body).toMatchObject({ id: "novo", titulo: "Festival", criadoPorId: "p1" });
    });

    it("ADMIN também cria", async () => {
      const res = await request(app).post("/eventos").set(admin()).send(valido);

      expect(res.status).toBe(201);
      expect(prismaMock.evento.create.mock.calls[0][0].data.criadoPorId).toBe("adm");
    });

    it("CLIENTE recebe 403 e nada é gravado", async () => {
      const res = await request(app).post("/eventos").set(cliente()).send(valido);

      expect(res.status).toBe(403);
      expect(prismaMock.evento.create).not.toHaveBeenCalled();
    });

    it("sem token responde 401", async () => {
      const res = await request(app).post("/eventos").send(valido);

      expect(res.status).toBe(401);
    });

    it("ignora id, criadoPorId, criadoEm e atualizadoEm vindos do corpo", async () => {
      await request(app)
        .post("/eventos")
        .set(criador())
        .send({ ...valido, id: "forjado", criadoPorId: "outro", criadoEm: "2000-01-01", atualizadoEm: "2000-01-01" });

      const { data } = prismaMock.evento.create.mock.calls[0][0];
      expect(data.criadoPorId).toBe("p1");
      expect(data).not.toHaveProperty("id");
      expect(data).not.toHaveProperty("criadoEm");
      expect(data).not.toHaveProperty("atualizadoEm");
    });

    it("aceita os campos opcionais e remove espaços das pontas", async () => {
      const res = await request(app)
        .post("/eventos")
        .set(criador())
        .send({
          ...valido,
          titulo: "  Festival  ",
          descricao: "Noite de música",
          nomeLocal: "Praça",
          imagemUrl: "https://exemplo.com/capa.png",
          terminaEm: "2026-12-11T02:00:00Z",
          categoriaId: "cat1",
        });

      expect(res.status).toBe(201);
      expect(prismaMock.evento.create.mock.calls[0][0].data).toMatchObject({
        titulo: "Festival",
        descricao: "Noite de música",
        nomeLocal: "Praça",
        imagemUrl: "https://exemplo.com/capa.png",
        terminaEm: new Date("2026-12-11T02:00:00Z"),
        categoriaId: "cat1",
      });
    });

    it.each([
      ["titulo ausente", { titulo: undefined }, "titulo é obrigatório"],
      ["titulo vazio", { titulo: "   " }, "titulo é obrigatório"],
      ["titulo que não é texto", { titulo: 42 }, "titulo é obrigatório"],
      ["titulo longo demais", { titulo: "x".repeat(201) }, "titulo deve ter no máximo 200 caracteres"],
      ["cidade ausente", { cidade: undefined }, "cidade é obrigatório"],
      ["comecaEm ausente", { comecaEm: undefined }, "comecaEm é obrigatório"],
      ["comecaEm em formato livre", { comecaEm: "amanhã" }, `comecaEm ${FORMATO_DATA}`],
      ["comecaEm numérico", { comecaEm: 1790000000000 }, `comecaEm ${FORMATO_DATA}`],
      ["comecaEm impossível", { comecaEm: "2026-13-45" }, "comecaEm deve ser uma data válida"],
      ["terminaEm antes de comecaEm", { terminaEm: "2026-12-10T19:00:00Z" }, "terminaEm não pode ser anterior a comecaEm"],
      ["descricao que não é texto", { descricao: 5 }, "descricao deve ser um texto"],
      ["imagemUrl que não é URL", { imagemUrl: "não é url" }, "imagemUrl deve ser uma URL http ou https válida"],
      ["imagemUrl javascript:", { imagemUrl: "javascript:alert(1)" }, "imagemUrl deve ser uma URL http ou https válida"],
      ["imagemUrl ftp:", { imagemUrl: "ftp://exemplo.com/a.png" }, "imagemUrl deve ser uma URL http ou https válida"],
    ])("%s responde 400 sem gravar", async (_nome, alteracao, mensagem) => {
      const res = await request(app)
        .post("/eventos")
        .set(criador())
        .send({ ...valido, ...alteracao });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: mensagem });
      expect(prismaMock.evento.create).not.toHaveBeenCalled();
    });

    it("corpo que não é um objeto responde 400", async () => {
      const res = await request(app).post("/eventos").set(criador()).send([valido]);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "O corpo deve ser um objeto JSON" });
    });

    it("terminaEm null é aceito", async () => {
      const res = await request(app)
        .post("/eventos")
        .set(criador())
        .send({ ...valido, terminaEm: null });

      expect(res.status).toBe(201);
    });

    it("categoria inexistente responde 400 (P2003)", async () => {
      prismaMock.evento.create.mockRejectedValue(prismaError("P2003", { constraint: "fk" }));

      const res = await request(app)
        .post("/eventos")
        .set(criador())
        .send({ ...valido, categoriaId: "nada" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Referência a registro inexistente");
    });
  });

  describe("PUT /:id", () => {
    beforeEach(() => {
      prismaMock.evento.update.mockImplementation(async ({ data }) => ({ ...salvo, ...data }));
    });

    it("o criador atualiza só os campos enviados", async () => {
      const res = await request(app).put("/eventos/e1").set(criador()).send({ titulo: "Show 2" });

      expect(res.status).toBe(200);
      expect(res.body.titulo).toBe("Show 2");
      expect(prismaMock.evento.update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { titulo: "Show 2" } });
    });

    it("ADMIN atualiza evento de outro criador", async () => {
      const res = await request(app).put("/eventos/e1").set(admin()).send({ cidade: "Caruaru" });

      expect(res.status).toBe(200);
    });

    it("outro PRODUTOR recebe 403 e nada é alterado", async () => {
      const res = await request(app).put("/eventos/e1").set(outroProdutor()).send({ titulo: "Roubado" });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: "Somente o criador do evento pode fazer isso" });
      expect(prismaMock.evento.update).not.toHaveBeenCalled();
    });

    it("CLIENTE recebe 403 sem consultar o evento", async () => {
      const res = await request(app).put("/eventos/e1").set(cliente()).send({ titulo: "X" });

      expect(res.status).toBe(403);
      expect(prismaMock.evento.findUnique).not.toHaveBeenCalled();
    });

    it("sem token responde 401", async () => {
      const res = await request(app).put("/eventos/e1").send({ titulo: "X" });

      expect(res.status).toBe(401);
    });

    it("não deixa transferir o evento: criadoPorId e id do corpo são ignorados", async () => {
      await request(app).put("/eventos/e1").set(criador()).send({ titulo: "Show 2", criadoPorId: "p2", id: "e9" });

      expect(prismaMock.evento.update.mock.calls[0][0].data).toEqual({ titulo: "Show 2" });
    });

    it("a checagem de dono vem antes da validação (corpo inválido de quem não é dono dá 403)", async () => {
      const res = await request(app).put("/eventos/e1").set(outroProdutor()).send({ titulo: "" });

      expect(res.status).toBe(403);
    });

    it("evento inexistente responde 404", async () => {
      prismaMock.evento.findUnique.mockResolvedValue(null);

      const res = await request(app).put("/eventos/nada").set(admin()).send({ titulo: "X" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Event not found" });
    });

    it("evento apagado entre a leitura e a gravação responde 404 (P2025)", async () => {
      prismaMock.evento.update.mockRejectedValue(prismaError("P2025"));

      const res = await request(app).put("/eventos/e1").set(criador()).send({ titulo: "X" });

      expect(res.status).toBe(404);
    });

    it("corpo sem nenhum campo válido responde 400", async () => {
      const res = await request(app).put("/eventos/e1").set(criador()).send({ criadoPorId: "p2" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Nenhum campo para atualizar" });
      expect(prismaMock.evento.update).not.toHaveBeenCalled();
    });

    it("null limpa os campos opcionais", async () => {
      const res = await request(app)
        .put("/eventos/e1")
        .set(criador())
        .send({ descricao: null, imagemUrl: null, terminaEm: null, nomeLocal: null, categoriaId: null });

      expect(res.status).toBe(200);
      expect(prismaMock.evento.update.mock.calls[0][0].data).toEqual({
        descricao: null,
        imagemUrl: null,
        terminaEm: null,
        nomeLocal: null,
        categoriaId: null,
      });
    });

    it.each([
      ["titulo vazio", { titulo: "" }, "titulo é obrigatório"],
      ["titulo null", { titulo: null }, "titulo é obrigatório"],
      ["cidade null", { cidade: null }, "cidade é obrigatório"],
      ["comecaEm null", { comecaEm: null }, `comecaEm ${FORMATO_DATA}`],
      ["imagemUrl inválida", { imagemUrl: "javascript:alert(1)" }, "imagemUrl deve ser uma URL http ou https válida"],
    ])("%s responde 400", async (_nome, corpo, mensagem) => {
      const res = await request(app).put("/eventos/e1").set(criador()).send(corpo);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: mensagem });
      expect(prismaMock.evento.update).not.toHaveBeenCalled();
    });

    it("mover o início para depois do fim já salvo responde 400", async () => {
      const res = await request(app).put("/eventos/e1").set(criador()).send({ comecaEm: "2026-12-05T00:00:00Z" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "terminaEm não pode ser anterior a comecaEm" });
    });

    it("pôr o fim antes do início já salvo responde 400", async () => {
      const res = await request(app).put("/eventos/e1").set(criador()).send({ terminaEm: "2026-11-30T00:00:00Z" });

      expect(res.status).toBe(400);
    });

    it("mover início e fim juntos para um período válido é aceito", async () => {
      const res = await request(app)
        .put("/eventos/e1")
        .set(criador())
        .send({ comecaEm: "2027-01-10T20:00:00Z", terminaEm: "2027-01-11T02:00:00Z" });

      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /:id", () => {
    it("o criador apaga (204, sem corpo)", async () => {
      prismaMock.evento.delete.mockResolvedValue(salvo);

      const res = await request(app).delete("/eventos/e1").set(criador());

      expect(res.status).toBe(204);
      expect(res.text).toBe("");
      expect(prismaMock.evento.delete).toHaveBeenCalledWith({ where: { id: "e1" } });
    });

    it("ADMIN apaga evento de outro criador", async () => {
      prismaMock.evento.delete.mockResolvedValue(salvo);

      const res = await request(app).delete("/eventos/e1").set(admin());

      expect(res.status).toBe(204);
    });

    it("outro PRODUTOR recebe 403 e nada é apagado", async () => {
      const res = await request(app).delete("/eventos/e1").set(outroProdutor());

      expect(res.status).toBe(403);
      expect(prismaMock.evento.delete).not.toHaveBeenCalled();
    });

    it("CLIENTE recebe 403", async () => {
      const res = await request(app).delete("/eventos/e1").set(cliente());

      expect(res.status).toBe(403);
      expect(prismaMock.evento.delete).not.toHaveBeenCalled();
    });

    it("sem token responde 401", async () => {
      const res = await request(app).delete("/eventos/e1");

      expect(res.status).toBe(401);
    });

    it("evento sem criador registrado só pode ser apagado por ADMIN", async () => {
      prismaMock.evento.findUnique.mockResolvedValue({ ...salvo, criadoPorId: null });
      prismaMock.evento.delete.mockResolvedValue(salvo);

      expect((await request(app).delete("/eventos/e1").set(criador())).status).toBe(403);
      expect((await request(app).delete("/eventos/e1").set(admin())).status).toBe(204);
    });

    it("evento inexistente responde 404", async () => {
      prismaMock.evento.findUnique.mockResolvedValue(null);

      const res = await request(app).delete("/eventos/nada").set(admin());

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Event not found" });
    });

    it("evento com lotes ou pedidos responde 409 (não perde vendas)", async () => {
      prismaMock.evento.delete.mockRejectedValue(prismaError("P2003", { constraint: "fk" }));

      const res = await request(app).delete("/eventos/e1").set(criador());

      expect(res.status).toBe(409);
    });
  });

  it("a leitura continua pública", async () => {
    prismaMock.evento.findMany.mockResolvedValue([salvo]);
    prismaMock.evento.count.mockResolvedValue(1);

    expect((await request(app).get("/eventos")).status).toBe(200);
    expect((await request(app).get("/eventos/e1")).status).toBe(200);
  });
});

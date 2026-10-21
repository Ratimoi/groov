import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaError } from "./helpers/prismaErrors";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

// Personagens: u1 é o líder do grupo g1, u2 é um membro comum, u9 não pertence ao grupo.
const grupo = { id: "g1", nome: "Rolê", liderId: "u1" };
const membro = { grupoId: "g1", usuarioId: "u2", usuario: { id: "u2", nome: "Bia" } };

const lider = () => logadoComo("CLIENTE", "u1");
const membroComum = () => logadoComo("CLIENTE", "u2");
const estranho = () => logadoComo("CLIENTE", "u9");
const admin = () => logadoComo("ADMIN", "adm");

describe("/grupos", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.grupo.findUnique.mockResolvedValue(grupo);
    // u2 é membro; qualquer outro usuário (u9) não é.
    prismaMock.membroGrupo.findUnique.mockImplementation(async ({ where }) =>
      where.grupoId_usuarioId.usuarioId === "u2" ? { grupoId: "g1" } : null,
    );
  });

  describe("criar (POST)", () => {
    it("o líder é o usuário logado, mesmo que o corpo mande outro liderId", async () => {
      prismaMock.grupo.create.mockResolvedValue(grupo);

      const res = await request(app).post("/grupos").set(membroComum()).send({ nome: "Rolê", liderId: "u1" });

      expect(res.status).toBe(201);
      expect(prismaMock.grupo.create).toHaveBeenCalledWith({
        data: { nome: "Rolê", liderId: "u2", membros: { create: { usuarioId: "u2" } } },
      });
    });

    it.each([
      ["ausente", {}],
      ["vazio", { nome: "   " }],
      ["que não é texto", { nome: 123 }],
    ])("nome %s responde 400 e não grava", async (_nome, corpo) => {
      const res = await request(app).post("/grupos").set(lider()).send(corpo);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "nome é obrigatório" });
      expect(prismaMock.grupo.create).not.toHaveBeenCalled();
    });

    it("sem token responde 401", async () => {
      const res = await request(app).post("/grupos").send({ nome: "Rolê" });

      expect(res.status).toBe(401);
    });
  });

  describe("listar (GET)", () => {
    it("usuário comum vê só os grupos de que participa", async () => {
      prismaMock.grupo.findMany.mockResolvedValue([grupo]);

      const res = await request(app).get("/grupos").set(membroComum());

      expect(res.status).toBe(200);
      expect(res.body).toEqual([grupo]);
      expect(prismaMock.grupo.findMany).toHaveBeenCalledWith({
        where: { membros: { some: { usuarioId: "u2" } } },
      });
    });

    it("ADMIN vê todos os grupos", async () => {
      prismaMock.grupo.findMany.mockResolvedValue([grupo]);

      const res = await request(app).get("/grupos").set(admin());

      expect(res.status).toBe(200);
      expect(prismaMock.grupo.findMany).toHaveBeenCalledWith();
    });
  });

  describe("consultar (GET /:id)", () => {
    it.each([
      ["o líder", lider],
      ["um membro", membroComum],
      ["um ADMIN", admin],
    ])("%s vê o grupo", async (_nome, quem) => {
      const res = await request(app).get("/grupos/g1").set(quem());

      expect(res.status).toBe(200);
      expect(res.body).toEqual(grupo);
    });

    it("quem não participa recebe 404, como se o grupo não existisse", async () => {
      const res = await request(app).get("/grupos/g1").set(estranho());

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Group not found" });
    });

    it("grupo inexistente responde 404", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/grupos/nada").set(admin());

      expect(res.status).toBe(404);
    });
  });

  describe("renomear (PUT /:id)", () => {
    beforeEach(() => {
      prismaMock.grupo.update.mockResolvedValue({ ...grupo, nome: "Novo" });
    });

    it("o líder renomeia; só o nome é alterado, ignorando outros campos do corpo", async () => {
      const res = await request(app).put("/grupos/g1").set(lider()).send({ nome: "Novo", liderId: "u9" });

      expect(res.status).toBe(200);
      expect(prismaMock.grupo.update).toHaveBeenCalledWith({ where: { id: "g1" }, data: { nome: "Novo" } });
    });

    it("ADMIN também renomeia", async () => {
      const res = await request(app).put("/grupos/g1").set(admin()).send({ nome: "Novo" });

      expect(res.status).toBe(200);
    });

    it("membro que não é líder recebe 403", async () => {
      const res = await request(app).put("/grupos/g1").set(membroComum()).send({ nome: "Novo" });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: "Somente o líder do grupo pode fazer isso" });
      expect(prismaMock.grupo.update).not.toHaveBeenCalled();
    });

    it("quem não participa recebe 404 e nada é alterado", async () => {
      const res = await request(app).put("/grupos/g1").set(estranho()).send({ nome: "Novo" });

      expect(res.status).toBe(404);
      expect(prismaMock.grupo.update).not.toHaveBeenCalled();
    });

    it("grupo inexistente responde 404", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(null);

      const res = await request(app).put("/grupos/nada").set(admin()).send({ nome: "X" });

      expect(res.status).toBe(404);
    });
  });

  describe("apagar (DELETE /:id)", () => {
    it("o líder apaga: membros e grupo saem na mesma transação", async () => {
      prismaMock.$transaction.mockResolvedValue([]);

      const res = await request(app).delete("/grupos/g1").set(lider());

      expect(res.status).toBe(204);
      expect(prismaMock.membroGrupo.deleteMany).toHaveBeenCalledWith({ where: { grupoId: "g1" } });
      expect(prismaMock.grupo.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it("ADMIN apaga qualquer grupo", async () => {
      prismaMock.$transaction.mockResolvedValue([]);

      const res = await request(app).delete("/grupos/g1").set(admin());

      expect(res.status).toBe(204);
    });

    it("membro que não é líder recebe 403 e nada é apagado", async () => {
      const res = await request(app).delete("/grupos/g1").set(membroComum());

      expect(res.status).toBe(403);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("quem não participa recebe 404 e nada é apagado", async () => {
      const res = await request(app).delete("/grupos/g1").set(estranho());

      expect(res.status).toBe(404);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("grupo inexistente responde 404", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(null);

      const res = await request(app).delete("/grupos/nada").set(admin());

      expect(res.status).toBe(404);
    });

    it("grupo com compra em grupo vinculada responde 409", async () => {
      prismaMock.$transaction.mockRejectedValue(prismaError("P2003", { constraint: "fk" }));

      const res = await request(app).delete("/grupos/g1").set(lider());

      expect(res.status).toBe(409);
    });
  });

  describe("membros", () => {
    describe("listar (GET /:id/members)", () => {
      it.each([
        ["o líder", lider],
        ["um membro", membroComum],
        ["um ADMIN", admin],
      ])("%s vê os membros", async (_nome, quem) => {
        prismaMock.membroGrupo.findMany.mockResolvedValue([membro]);

        const res = await request(app).get("/grupos/g1/members").set(quem());

        expect(res.status).toBe(200);
        expect(res.body).toEqual([membro]);
      });

      it("quem não participa recebe 404 e não vê a lista", async () => {
        const res = await request(app).get("/grupos/g1/members").set(estranho());

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "Grupo não encontrado" });
        expect(prismaMock.membroGrupo.findMany).not.toHaveBeenCalled();
      });

      it("grupo inexistente responde 404", async () => {
        prismaMock.grupo.findUnique.mockResolvedValue(null);

        const res = await request(app).get("/grupos/nada/members").set(admin());

        expect(res.status).toBe(404);
      });
    });

    describe("adicionar (POST /:id/members)", () => {
      beforeEach(() => {
        prismaMock.membroGrupo.create.mockResolvedValue(membro);
      });

      it("o líder adiciona um membro", async () => {
        const res = await request(app).post("/grupos/g1/members").set(lider()).send({ usuarioId: "u2" });

        expect(res.status).toBe(201);
        expect(prismaMock.membroGrupo.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: { grupoId: "g1", usuarioId: "u2" } }),
        );
      });

      it("ADMIN adiciona um membro", async () => {
        const res = await request(app).post("/grupos/g1/members").set(admin()).send({ usuarioId: "u2" });

        expect(res.status).toBe(201);
      });

      it("membro que não é líder recebe 403 (não pode convidar)", async () => {
        const res = await request(app).post("/grupos/g1/members").set(membroComum()).send({ usuarioId: "u5" });

        expect(res.status).toBe(403);
        expect(prismaMock.membroGrupo.create).not.toHaveBeenCalled();
      });

      it("quem não participa recebe 404, sem se adicionar ao grupo", async () => {
        const res = await request(app).post("/grupos/g1/members").set(estranho()).send({ usuarioId: "u9" });

        expect(res.status).toBe(404);
        expect(prismaMock.membroGrupo.create).not.toHaveBeenCalled();
      });

      it("quem já é membro responde 409", async () => {
        prismaMock.membroGrupo.create.mockRejectedValue(prismaError("P2002", { target: ["grupoId", "usuarioId"] }));

        const res = await request(app).post("/grupos/g1/members").set(lider()).send({ usuarioId: "u2" });

        expect(res.status).toBe(409);
      });

      it("usuário inexistente responde 400 (P2003)", async () => {
        prismaMock.membroGrupo.create.mockRejectedValue(prismaError("P2003", { constraint: "fk" }));

        const res = await request(app).post("/grupos/g1/members").set(lider()).send({ usuarioId: "nada" });

        expect(res.status).toBe(400);
      });

      it.each([
        ["ausente", {}],
        ["vazio", { usuarioId: "" }],
        ["que não é texto", { usuarioId: { id: "u2" } }],
      ])("usuarioId %s responde 400", async (_nome, corpo) => {
        const res = await request(app).post("/grupos/g1/members").set(lider()).send(corpo);

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "usuarioId é obrigatório" });
        expect(prismaMock.membroGrupo.create).not.toHaveBeenCalled();
      });
    });

    describe("remover (DELETE /:id/members/:usuarioId)", () => {
      beforeEach(() => {
        prismaMock.membroGrupo.delete.mockResolvedValue(membro);
      });

      it("o líder remove um membro", async () => {
        const res = await request(app).delete("/grupos/g1/members/u2").set(lider());

        expect(res.status).toBe(204);
        expect(prismaMock.membroGrupo.delete).toHaveBeenCalledWith({
          where: { grupoId_usuarioId: { grupoId: "g1", usuarioId: "u2" } },
        });
      });

      it("ADMIN remove um membro", async () => {
        const res = await request(app).delete("/grupos/g1/members/u2").set(admin());

        expect(res.status).toBe(204);
      });

      it("um membro pode sair do grupo sozinho", async () => {
        const res = await request(app).delete("/grupos/g1/members/u2").set(membroComum());

        expect(res.status).toBe(204);
      });

      it("um membro não remove outro membro (403)", async () => {
        const res = await request(app).delete("/grupos/g1/members/u5").set(membroComum());

        expect(res.status).toBe(403);
        expect(prismaMock.membroGrupo.delete).not.toHaveBeenCalled();
      });

      it("quem não participa recebe 404", async () => {
        const res = await request(app).delete("/grupos/g1/members/u2").set(estranho());

        expect(res.status).toBe(404);
        expect(prismaMock.membroGrupo.delete).not.toHaveBeenCalled();
      });

      it("não permite remover o líder do grupo, nem ele mesmo sair", async () => {
        const res = await request(app).delete("/grupos/g1/members/u1").set(lider());

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "O líder não pode ser removido do grupo" });
        expect(prismaMock.membroGrupo.delete).not.toHaveBeenCalled();
      });

      it("ADMIN também não remove o líder", async () => {
        const res = await request(app).delete("/grupos/g1/members/u1").set(admin());

        expect(res.status).toBe(400);
      });

      it("remover quem não é membro responde 404", async () => {
        prismaMock.membroGrupo.delete.mockRejectedValue(prismaError("P2025"));

        const res = await request(app).delete("/grupos/g1/members/u7").set(lider());

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "Membro não encontrado no grupo" });
      });

      it("grupo inexistente responde 404", async () => {
        prismaMock.grupo.findUnique.mockResolvedValue(null);

        const res = await request(app).delete("/grupos/nada/members/u2").set(admin());

        expect(res.status).toBe(404);
      });
    });
  });
});

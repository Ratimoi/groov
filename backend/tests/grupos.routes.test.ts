import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";
import { prismaError } from "./helpers/prismaErrors";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const grupo = { id: "g1", nome: "Rolê", liderId: "u1" };
const membro = { grupoId: "g1", usuarioId: "u2", usuario: { id: "u2", nome: "Bia" } };

describe("/grupos", () => {
  beforeEach(resetPrismaMock);

  describe("CRUD", () => {
    it("POST cria o grupo já com o líder como primeiro membro", async () => {
      prismaMock.grupo.create.mockResolvedValue(grupo);

      const res = await request(app).post("/grupos").send({ nome: "Rolê", liderId: "u1" });

      expect(res.status).toBe(201);
      expect(prismaMock.grupo.create).toHaveBeenCalledWith({
        data: { nome: "Rolê", liderId: "u1", membros: { create: { usuarioId: "u1" } } },
      });
    });

    it("POST com líder inexistente responde 400 (P2003)", async () => {
      prismaMock.grupo.create.mockRejectedValue(prismaError("P2003", { constraint: "fk" }));

      const res = await request(app).post("/grupos").send({ nome: "Rolê", liderId: "nada" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Referência a registro inexistente");
    });

    it("GET lista os grupos", async () => {
      prismaMock.grupo.findMany.mockResolvedValue([grupo]);

      const res = await request(app).get("/grupos");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([grupo]);
    });

    it("GET /:id devolve o grupo", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(grupo);

      const res = await request(app).get("/grupos/g1");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(grupo);
    });

    it("GET /:id inexistente responde 404", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/grupos/nada");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Group not found" });
    });

    it("PUT /:id só altera o nome, ignorando outros campos do corpo", async () => {
      prismaMock.grupo.update.mockResolvedValue({ ...grupo, nome: "Novo" });

      const res = await request(app).put("/grupos/g1").send({ nome: "Novo", liderId: "outro" });

      expect(res.status).toBe(200);
      expect(prismaMock.grupo.update).toHaveBeenCalledWith({ where: { id: "g1" }, data: { nome: "Novo" } });
    });

    it("PUT /:id inexistente responde 404", async () => {
      prismaMock.grupo.update.mockRejectedValue(prismaError("P2025"));

      const res = await request(app).put("/grupos/nada").send({ nome: "X" });

      expect(res.status).toBe(404);
    });

    it("DELETE /:id remove os membros e o grupo na mesma transação", async () => {
      prismaMock.$transaction.mockResolvedValue([]);

      const res = await request(app).delete("/grupos/g1");

      expect(res.status).toBe(204);
      expect(prismaMock.membroGrupo.deleteMany).toHaveBeenCalledWith({ where: { grupoId: "g1" } });
      expect(prismaMock.grupo.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it("DELETE /:id inexistente responde 404", async () => {
      prismaMock.$transaction.mockRejectedValue(prismaError("P2025"));

      const res = await request(app).delete("/grupos/nada");

      expect(res.status).toBe(404);
    });

    it("DELETE /:id com compra em grupo vinculada responde 409", async () => {
      prismaMock.$transaction.mockRejectedValue(prismaError("P2003", { constraint: "fk" }));

      const res = await request(app).delete("/grupos/g1");

      expect(res.status).toBe(409);
    });
  });

  describe("membros", () => {
    it("GET /:id/members lista os membros", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(grupo);
      prismaMock.membroGrupo.findMany.mockResolvedValue([membro]);

      const res = await request(app).get("/grupos/g1/members");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([membro]);
    });

    it("GET /:id/members de grupo inexistente responde 404", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/grupos/nada/members");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Grupo não encontrado" });
      expect(prismaMock.membroGrupo.findMany).not.toHaveBeenCalled();
    });

    it("POST /:id/members adiciona o membro", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(grupo);
      prismaMock.membroGrupo.create.mockResolvedValue(membro);

      const res = await request(app).post("/grupos/g1/members").send({ usuarioId: "u2" });

      expect(res.status).toBe(201);
      expect(prismaMock.membroGrupo.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { grupoId: "g1", usuarioId: "u2" } }),
      );
    });

    it("POST /:id/members de quem já é membro responde 409", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(grupo);
      prismaMock.membroGrupo.create.mockRejectedValue(prismaError("P2002", { target: ["grupoId", "usuarioId"] }));

      const res = await request(app).post("/grupos/g1/members").send({ usuarioId: "u2" });

      expect(res.status).toBe(409);
    });

    it("POST /:id/members em grupo inexistente responde 404 sem tentar criar", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(null);

      const res = await request(app).post("/grupos/nada/members").send({ usuarioId: "u2" });

      expect(res.status).toBe(404);
      expect(prismaMock.membroGrupo.create).not.toHaveBeenCalled();
    });

    it("DELETE /:id/members/:usuarioId remove o membro", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(grupo);
      prismaMock.membroGrupo.delete.mockResolvedValue(membro);

      const res = await request(app).delete("/grupos/g1/members/u2");

      expect(res.status).toBe(204);
      expect(prismaMock.membroGrupo.delete).toHaveBeenCalledWith({
        where: { grupoId_usuarioId: { grupoId: "g1", usuarioId: "u2" } },
      });
    });

    it("não permite remover o líder do grupo", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(grupo);

      const res = await request(app).delete("/grupos/g1/members/u1");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "O líder não pode ser removido do grupo" });
      expect(prismaMock.membroGrupo.delete).not.toHaveBeenCalled();
    });

    it("remover quem não é membro responde 404", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(grupo);
      prismaMock.membroGrupo.delete.mockRejectedValue(prismaError("P2025"));

      const res = await request(app).delete("/grupos/g1/members/u9");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Membro não encontrado no grupo" });
    });

    it("remover membro de grupo inexistente responde 404", async () => {
      prismaMock.grupo.findUnique.mockResolvedValue(null);

      const res = await request(app).delete("/grupos/nada/members/u2");

      expect(res.status).toBe(404);
    });
  });
});

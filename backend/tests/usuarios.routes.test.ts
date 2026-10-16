import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";
import { prismaError } from "./helpers/prismaErrors";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const usuario = {
  id: "u1",
  nome: "Ana",
  username: "ana",
  email: "ana@example.com",
  papel: "CLIENTE",
};

describe("/usuarios", () => {
  beforeEach(resetPrismaMock);

  it("POST cria o usuário e responde 201", async () => {
    prismaMock.usuario.create.mockResolvedValue(usuario);
    const body = { nome: "Ana", username: "ana", email: "ana@example.com", senha: "x" };

    const res = await request(app).post("/usuarios").send(body);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: "u1", username: "ana" });
    expect(prismaMock.usuario.create).toHaveBeenCalledWith({ data: body });
  });

  it("POST com username ou email repetido responde 409", async () => {
    prismaMock.usuario.create.mockRejectedValue(prismaError("P2002", { target: ["username"] }));

    const res = await request(app).post("/usuarios").send({ username: "ana" });

    expect(res.status).toBe(409);
    expect(res.body.fields).toEqual(["username"]);
  });

  it("GET lista os usuários", async () => {
    prismaMock.usuario.findMany.mockResolvedValue([usuario]);

    const res = await request(app).get("/usuarios");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET /:id devolve o usuário", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuario);

    const res = await request(app).get("/usuarios/u1");

    expect(res.status).toBe(200);
    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("GET /:id inexistente responde 404", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/usuarios/nada");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "User not found" });
  });

  it("PUT /:id atualiza o usuário", async () => {
    prismaMock.usuario.update.mockResolvedValue({ ...usuario, nome: "Ana Maria" });

    const res = await request(app).put("/usuarios/u1").send({ nome: "Ana Maria" });

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe("Ana Maria");
  });

  it("PUT /:id inexistente responde 404 (P2025 é traduzido)", async () => {
    prismaMock.usuario.update.mockRejectedValue(prismaError("P2025"));

    const res = await request(app).put("/usuarios/nada").send({ nome: "X" });

    expect(res.status).toBe(404);
  });

  it("DELETE /:id responde 204 sem corpo", async () => {
    prismaMock.usuario.delete.mockResolvedValue(usuario);

    const res = await request(app).delete("/usuarios/u1");

    expect(res.status).toBe(204);
    expect(res.text).toBe("");
  });

  it("DELETE /:id inexistente responde 404", async () => {
    prismaMock.usuario.delete.mockRejectedValue(prismaError("P2025"));

    const res = await request(app).delete("/usuarios/nada");

    expect(res.status).toBe(404);
  });

  it("DELETE /:id com dependências responde 409", async () => {
    prismaMock.usuario.delete.mockRejectedValue(prismaError("P2003", { constraint: "fk" }));

    const res = await request(app).delete("/usuarios/u1");

    expect(res.status).toBe(409);
  });
});

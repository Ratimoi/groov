import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const grupo = { id: "g1", nome: "Rolê", liderId: "u1" };

describe("POST /grupos/:id/convite", () => {
  beforeEach(resetPrismaMock);

  it("sem token responde 401", async () => {
    const res = await request(app).post("/grupos/g1/convite");

    expect(res.status).toBe(401);
    expect(prismaMock.conviteGrupo.upsert).not.toHaveBeenCalled();
  });

  it("o líder recebe o código do grupo (mesmo código a cada pedido)", async () => {
    prismaMock.grupo.findUnique.mockResolvedValue(grupo);
    prismaMock.conviteGrupo.upsert.mockResolvedValue({ codigo: "ABCD2345", grupoId: "g1" });

    const res = await request(app).post("/grupos/g1/convite").set(logadoComo("CLIENTE", "u1"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ codigo: "ABCD2345" });
    const args = prismaMock.conviteGrupo.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ grupoId: "g1" });
    expect(args.update).toEqual({});
    expect(args.create.codigo).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  it("membro que não é líder recebe 403", async () => {
    prismaMock.grupo.findUnique.mockResolvedValue(grupo);
    prismaMock.membroGrupo.findUnique.mockResolvedValue({ grupoId: "g1" });

    const res = await request(app).post("/grupos/g1/convite").set(logadoComo("CLIENTE", "u2"));

    expect(res.status).toBe(403);
    expect(prismaMock.conviteGrupo.upsert).not.toHaveBeenCalled();
  });

  it("quem não participa do grupo recebe 404", async () => {
    prismaMock.grupo.findUnique.mockResolvedValue(grupo);
    prismaMock.membroGrupo.findUnique.mockResolvedValue(null);

    const res = await request(app).post("/grupos/g1/convite").set(logadoComo("CLIENTE", "u3"));

    expect(res.status).toBe(404);
  });
});

describe("POST /grupos/entrar", () => {
  beforeEach(resetPrismaMock);

  it("sem token responde 401", async () => {
    const res = await request(app).post("/grupos/entrar").send({ codigo: "ABCD2345" });

    expect(res.status).toBe(401);
  });

  it.each([
    ["sem corpo", undefined],
    ["sem codigo", {}],
    ["codigo vazio", { codigo: " " }],
    ["codigo numérico", { codigo: 1 }],
    ["codigo gigante", { codigo: "A".repeat(33) }],
  ])("%s responde 400", async (_nome, corpo) => {
    const res = await request(app).post("/grupos/entrar").set(logadoComo("CLIENTE", "u2")).send(corpo as object);

    expect(res.status).toBe(400);
    expect(prismaMock.conviteGrupo.findUnique).not.toHaveBeenCalled();
  });

  it("código desconhecido responde 404", async () => {
    prismaMock.conviteGrupo.findUnique.mockResolvedValue(null);

    const res = await request(app).post("/grupos/entrar").set(logadoComo("CLIENTE", "u2")).send({ codigo: "NAOEXIST" });

    expect(res.status).toBe(404);
    expect(prismaMock.membroGrupo.create).not.toHaveBeenCalled();
  });

  it("entra no grupo (código em minúsculas e com espaços é aceito)", async () => {
    prismaMock.conviteGrupo.findUnique.mockResolvedValue({ codigo: "ABCD2345", grupoId: "g1", grupo: { id: "g1", nome: "Rolê" } });
    prismaMock.membroGrupo.findUnique.mockResolvedValue(null);
    prismaMock.membroGrupo.create.mockResolvedValue({ id: "m1" });

    const res = await request(app).post("/grupos/entrar").set(logadoComo("CLIENTE", "u2")).send({ codigo: " abcd2345 " });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ grupo: { id: "g1", nome: "Rolê" }, jaEraMembro: false });
    expect(prismaMock.conviteGrupo.findUnique.mock.calls[0][0].where).toEqual({ codigo: "ABCD2345" });
    expect(prismaMock.membroGrupo.create.mock.calls[0][0].data).toEqual({ grupoId: "g1", usuarioId: "u2" });
  });

  it("quem já é membro não é duplicado", async () => {
    prismaMock.conviteGrupo.findUnique.mockResolvedValue({ codigo: "ABCD2345", grupoId: "g1", grupo: { id: "g1", nome: "Rolê" } });
    prismaMock.membroGrupo.findUnique.mockResolvedValue({ grupoId: "g1" });

    const res = await request(app).post("/grupos/entrar").set(logadoComo("CLIENTE", "u2")).send({ codigo: "ABCD2345" });

    expect(res.status).toBe(200);
    expect(res.body.jaEraMembro).toBe(true);
    expect(prismaMock.membroGrupo.create).not.toHaveBeenCalled();
  });
});

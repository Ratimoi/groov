import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const lote = (over = {}) => ({ preco: "50.00", quantidade: 10, quantidadeVendida: 0, quantidadeReservada: 0, ...over });
const evento = (id: string, criadoEm: string, over = {}) => ({
  id,
  titulo: `Evento ${id}`,
  criadoPorId: "org1",
  criadoPor: { id: "org1", nome: "Org", username: "org", avatarUrl: null },
  criadoEm: new Date(criadoEm),
  atracoes: [],
  lotes: [lote()],
  _count: { curtidas: 3 },
  ...over,
});

describe("GET /feed", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.curtidaEvento.findMany.mockResolvedValue([]);
    prismaMock.eventoSalvo.findMany.mockResolvedValue([]);
    prismaMock.seguidor.findMany.mockResolvedValue([]);
  });

  it("exige login", async () => {
    expect((await request(app).get("/feed")).status).toBe(401);
  });

  it("devolve os eventos com o estado do usuário e o menor preço com estoque", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    prismaMock.evento.findMany.mockResolvedValue([
      evento("e1", "2026-11-02T10:00:00Z", { lotes: [lote({ preco: "80.00" }), lote({ preco: "20.00", quantidadeVendida: 10 })] }),
      evento("e2", "2026-11-01T10:00:00Z", { lotes: [lote({ quantidadeVendida: 10 })] }),
    ]);
    prismaMock.curtidaEvento.findMany.mockResolvedValue([{ eventoId: "e1" }]);
    prismaMock.seguidor.findMany.mockResolvedValue([{ seguidoId: "org1" }]);

    const res = await request(app).get("/feed").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.nextCursor).toBeNull();
    expect(res.body.data[0]).toMatchObject({ id: "e1", menorPreco: "80.00", curtidas: 3, curtido: true, salvo: false, seguindo: true });
    expect(res.body.data[1]).toMatchObject({ id: "e2", menorPreco: null, curtido: false });
  });

  it("pagina: pede limit+1 e devolve o cursor do último item", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    prismaMock.evento.findMany.mockResolvedValue([
      evento("e3", "2026-11-03T10:00:00Z"),
      evento("e2", "2026-11-02T10:00:00Z"),
      evento("e1", "2026-11-01T10:00:00Z"),
    ]);

    const res = await request(app).get("/feed?limit=2").set(auth);

    expect(prismaMock.evento.findMany.mock.calls[0][0].take).toBe(3);
    expect(res.body.data.map((e: { id: string }) => e.id)).toEqual(["e3", "e2"]);
    expect(Buffer.from(res.body.nextCursor, "base64url").toString()).toBe("2026-11-02T10:00:00.000Z|e2");
  });

  it("usa o cursor no filtro e a aba seguindo", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    prismaMock.evento.findMany.mockResolvedValue([]);
    const cursor = Buffer.from("2026-11-02T10:00:00.000Z|e2").toString("base64url");

    const res = await request(app).get(`/feed?aba=seguindo&cursor=${cursor}`).set(auth);

    expect(res.status).toBe(200);
    const where = prismaMock.evento.findMany.mock.calls[0][0].where;
    expect(where.criadoPor).toEqual({ seguidores: { some: { seguidorId: "u1" } } });
    expect(where.AND).toBeDefined();
    expect(where.ocultoEm).toBeNull();
  });

  it("salvos não filtra por data", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    prismaMock.evento.findMany.mockResolvedValue([]);

    await request(app).get("/feed?aba=salvos").set(auth);

    const where = prismaMock.evento.findMany.mock.calls[0][0].where;
    expect(where.comecaEm).toBeUndefined();
    expect(where.salvos).toEqual({ some: { usuarioId: "u1" } });
  });

  it.each(["?aba=outra", "?limit=0", "?limit=99", "?cursor=lixo"])("rejeita parâmetro inválido %s", async (qs) => {
    const auth = logadoComo("CLIENTE", "u1");
    prismaMock.evento.findMany.mockResolvedValue([]);

    expect((await request(app).get(`/feed${qs}`).set(auth)).status).toBe(400);
  });
});

describe("interações do feed", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.evento.findUnique.mockResolvedValue({ id: "e1", ocultoEm: null });
    prismaMock.curtidaEvento.count.mockResolvedValue(4);
  });

  it("curtir é idempotente e devolve a contagem", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    const res = await request(app).post("/eventos/e1/curtir").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ curtido: true, curtidas: 4 });
    expect(prismaMock.curtidaEvento.createMany).toHaveBeenCalledWith({ data: [{ eventoId: "e1", usuarioId: "u1" }], skipDuplicates: true });
  });

  it("descurtir remove a curtida", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    const res = await request(app).delete("/eventos/e1/curtir").set(auth);

    expect(res.body).toEqual({ curtido: false, curtidas: 4 });
    expect(prismaMock.curtidaEvento.deleteMany).toHaveBeenCalledWith({ where: { eventoId: "e1", usuarioId: "u1" } });
  });

  it("salvar e remover dos salvos", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    expect((await request(app).post("/eventos/e1/salvar").set(auth)).body).toEqual({ salvo: true });
    expect((await request(app).delete("/eventos/e1/salvar").set(auth)).body).toEqual({ salvo: false });
  });

  it("evento inexistente ou oculto responde 404", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    prismaMock.evento.findUnique.mockResolvedValue({ id: "e1", ocultoEm: new Date() });

    expect((await request(app).post("/eventos/e1/curtir").set(auth)).status).toBe(404);
    expect(prismaMock.curtidaEvento.createMany).not.toHaveBeenCalled();
  });

  it("exige login", async () => {
    expect((await request(app).post("/eventos/e1/curtir")).status).toBe(401);
  });

  it("seguir um usuário e deixar de seguir", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "u1", papel: "CLIENTE" }).mockResolvedValueOnce({ id: "org1" });

    const res = await request(app).post("/usuarios/org1/seguir").set(auth);
    expect(res.body).toEqual({ seguindo: true });
    expect(prismaMock.seguidor.createMany).toHaveBeenCalledWith({ data: [{ seguidorId: "u1", seguidoId: "org1" }], skipDuplicates: true });

    prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "u1", papel: "CLIENTE" });
    const del = await request(app).delete("/usuarios/org1/seguir").set(auth);
    expect(del.body).toEqual({ seguindo: false });
  });

  it("não deixa seguir a si mesmo nem usuário inexistente", async () => {
    const auth = logadoComo("CLIENTE", "u1");
    expect((await request(app).post("/usuarios/u1/seguir").set(auth)).status).toBe(400);

    prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "u1", papel: "CLIENTE" }).mockResolvedValueOnce(null);
    expect((await request(app).post("/usuarios/nada/seguir").set(auth)).status).toBe(404);
  });
});

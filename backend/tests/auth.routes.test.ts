import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "../src/utils/password";
import { verifyToken } from "../src/utils/token";
import { bearer, logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const SENHA = "senha-segura-123";
const SEGREDO = process.env.JWT_SECRET as string;

const publico = { id: "u1", nome: "Ana", username: "ana", email: "ana@example.com", papel: "CLIENTE" };
let usuarioComSenha: typeof publico & { senha: string };

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("autenticação", () => {
  beforeAll(async () => {
    usuarioComSenha = { ...publico, senha: await hashPassword(SENHA) };
  });
  beforeEach(resetPrismaMock);

  describe("POST /auth/login", () => {
    it("com credenciais certas devolve o token e o usuário, sem a senha", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(usuarioComSenha);

      const res = await request(app).post("/auth/login").send({ email: "ana@example.com", senha: SENHA });

      expect(res.status).toBe(200);
      expect(res.body.usuario).toEqual({ ...publico, temCpf: false });
      expect(JSON.stringify(res.body)).not.toContain(usuarioComSenha.senha);
      expect(verifyToken(res.body.token)).toBe("u1");
      expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({ where: { email: "ana@example.com" } });
    });

    it("avisa que a conta tem CPF sem nunca devolver o número", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ ...usuarioComSenha, cpf: "52998224725" });

      const res = await request(app).post("/auth/login").send({ email: "ana@example.com", senha: SENHA });

      expect(res.body.usuario.temCpf).toBe(true);
      expect(JSON.stringify(res.body)).not.toContain("52998224725");
    });

    it("o token expira no prazo configurado (padrão 1 dia)", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(usuarioComSenha);

      const res = await request(app).post("/auth/login").send({ email: "ana@example.com", senha: SENHA });

      const { iat, exp } = jwt.decode(res.body.token) as { iat: number; exp: number };
      expect(exp - iat).toBe(24 * 60 * 60);
    });

    it("senha errada responde 401", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(usuarioComSenha);

      const res = await request(app).post("/auth/login").send({ email: "ana@example.com", senha: "senha-errada-1" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Credenciais inválidas" });
    });

    it("e-mail inexistente responde 401 com a mesma mensagem (não revela se a conta existe)", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      const res = await request(app).post("/auth/login").send({ email: "ninguem@example.com", senha: SENHA });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Credenciais inválidas" });
    });

    it("conta com senha em formato antigo (texto puro) não consegue entrar", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ ...publico, senha: SENHA });

      const res = await request(app).post("/auth/login").send({ email: "ana@example.com", senha: SENHA });

      expect(res.status).toBe(401);
    });

    it.each([
      ["sem corpo", undefined],
      ["sem senha", { email: "ana@example.com" }],
      ["sem email", { senha: SENHA }],
      ["com senha que não é texto", { email: "ana@example.com", senha: 12345678 }],
      ["com email que não é texto", { email: { $ne: null }, senha: SENHA }],
    ])("%s responde 400 sem consultar o banco", async (_nome, corpo) => {
      const res = await request(app).post("/auth/login").send(corpo);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "email e senha são obrigatórios" });
      expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("tokens (GET /auth/me)", () => {
    // O usuário existe no banco: assim, qualquer 401 vem do token e não de "usuário não encontrado".
    beforeEach(() => {
      prismaMock.usuario.findUnique.mockResolvedValue(publico);
    });

    it("com token válido devolve o usuário logado, sem a senha", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(publico);

      const res = await request(app).get("/auth/me").set(bearer("u1"));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...publico, temCpf: false });
    });

    it("informa temCpf sem expor o CPF", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ ...publico, cpf: "52998224725" });

      const res = await request(app).get("/auth/me").set(bearer("u1"));

      expect(res.body.temCpf).toBe(true);
      expect(res.body).not.toHaveProperty("cpf");
    });

    it("aceita o esquema Bearer em qualquer caixa", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(publico);

      const res = await request(app).get("/auth/me").set("Authorization", bearer("u1").Authorization.replace(/^Bearer/, "bEaReR"));

      expect(res.status).toBe(200);
    });

    it("sem Authorization responde 401", async () => {
      const res = await request(app).get("/auth/me");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Token de autenticação ausente" });
    });

    it.each([
      ["esquema diferente de Bearer", "Basic dXNlcjpwYXNz"],
      ["Bearer sem token", "Bearer"],
      ["token que não é JWT", "Bearer abc"],
    ])("%s responde 401", async (_nome, header) => {
      const res = await request(app).get("/auth/me").set("Authorization", header);

      expect(res.status).toBe(401);
      expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
    });

    it("token expirado responde 401", async () => {
      const expirado = jwt.sign({}, SEGREDO, { subject: "u1", expiresIn: -10 });

      const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${expirado}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Token inválido ou expirado" });
    });

    it("token assinado com outro segredo responde 401", async () => {
      const forjado = jwt.sign({}, "outro-segredo-com-mais-de-32-caracteres!!", { subject: "u1" });

      const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${forjado}`);

      expect(res.status).toBe(401);
    });

    it("token adulterado (payload trocado, assinatura antiga) responde 401", async () => {
      const [cabecalho, , assinatura] = bearer("u1").Authorization.replace("Bearer ", "").split(".");
      const adulterado = [cabecalho, base64url({ sub: "adm" }), assinatura].join(".");

      const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${adulterado}`);

      expect(res.status).toBe(401);
    });

    it('token sem assinatura (alg "none") responde 401', async () => {
      const semAssinatura = `${base64url({ alg: "none", typ: "JWT" })}.${base64url({ sub: "u1" })}.`;

      const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${semAssinatura}`);

      expect(res.status).toBe(401);
      expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
    });

    it("token de outro algoritmo (HS512) responde 401", async () => {
      const outro = jwt.sign({}, SEGREDO, { subject: "u1", algorithm: "HS512" });

      const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${outro}`);

      expect(res.status).toBe(401);
    });

    it("token sem sub responde 401", async () => {
      const semSub = jwt.sign({}, SEGREDO);

      const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${semSub}`);

      expect(res.status).toBe(401);
    });

    it("token válido de usuário que foi apagado responde 401", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/auth/me").set(bearer("fantasma"));

      expect(res.status).toBe(401);
    });

    it("o papel vale o do banco no momento da requisição, não o de quando o token foi emitido", async () => {
      const auth = bearer("u1");
      prismaMock.usuario.findMany.mockResolvedValue([]);

      prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "u1", papel: "ADMIN" });
      expect((await request(app).get("/usuarios").set(auth)).status).toBe(200);

      prismaMock.usuario.findUnique.mockResolvedValueOnce({ id: "u1", papel: "CLIENTE" }); // rebaixado
      expect((await request(app).get("/usuarios").set(auth)).status).toBe(403);
    });
  });

  describe("rotas que exigem login", () => {
    it.each([
      ["GET", "/grupos"],
      ["POST", "/grupos"],
      ["GET", "/grupos/g1"],
      ["GET", "/grupos/compras"],
      ["POST", "/grupos/compras"],
      ["GET", "/usuarios"],
    ])("%s %s sem token responde 401", async (metodo, caminho) => {
      const res = await request(app)[metodo.toLowerCase() as "get" | "post"](caminho);

      expect(res.status).toBe(401);
    });

    it("rotas públicas continuam abertas: saúde, listagem de eventos e cadastro", async () => {
      prismaMock.evento.findMany.mockResolvedValue([]);
      prismaMock.evento.count.mockResolvedValue(0);
      prismaMock.usuario.create.mockResolvedValue(publico);

      expect((await request(app).get("/health")).status).toBe(200);
      expect((await request(app).get("/eventos")).status).toBe(200);
      expect(
        (await request(app).post("/usuarios").send({ nome: "Ana", username: "ana", email: "a@b.c", senha: SENHA, cpf: "52998224725" })).status,
      ).toBe(201);
    });

    it("com token válido a rota de grupos é liberada", async () => {
      prismaMock.grupo.findMany.mockResolvedValue([]);

      const res = await request(app).get("/grupos").set(logadoComo("CLIENTE", "u1"));

      expect(res.status).toBe(200);
    });
  });
});

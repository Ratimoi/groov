import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MercadoPagoProvider } from "../src/services/payments/MercadoPagoProvider";
import { SimulatedProvider } from "../src/services/payments/SimulatedProvider";
import type { PaymentProvider } from "../src/services/payments/PaymentProvider";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");
const { PaymentService } = await import("../src/services/PaymentService");

const ator = { id: "u1", papel: "CLIENTE" as const };

function pagamento(over: Record<string, unknown> = {}) {
  return {
    id: "pg1",
    usuarioId: "u1",
    metodo: "PIX",
    status: "PENDENTE",
    provedor: "SIMULADO",
    valor: { toString: () => "112.50" },
    itens: [{ tipo: "PEDIDO", loteId: "l1", quantidade: 1 }],
    expiraEm: new Date(Date.now() + 60_000),
    pixCopiaECola: null,
    pixQrCodeBase64: null,
    checkoutUrl: null,
    erroEmissao: null,
    resultado: null,
    ...over,
  };
}

// Monta o serviço com tudo falso, para olhar só a lógica de pagamento.
function montar(provider: PaymentProvider, guardado = pagamento()) {
  let atual = guardado;
  const model = {
    userEmail: vi.fn().mockResolvedValue("a@b.com"),
    create: vi.fn().mockImplementation(async () => atual),
    saveCharge: vi.fn().mockImplementation(async (_id: string, c: Record<string, unknown>) => (atual = { ...atual, ...c })),
    findById: vi.fn().mockImplementation(async () => atual),
    transition: vi.fn().mockImplementation(async (_id: string, de: string[], para: string) => {
      if (!de.includes(atual.status as string)) return false;
      atual = { ...atual, status: para };
      return true;
    }),
    saveResult: vi.fn().mockImplementation(async (_id: string, resultado: unknown, erro: string | null) => {
      atual = { ...atual, resultado, erroEmissao: erro } as typeof atual;
    }),
    findOrders: vi.fn().mockResolvedValue([{ id: "p1" }]),
  };
  const orders = {
    plan: vi.fn().mockResolvedValue({ valorCents: 11250 }),
    create: vi.fn().mockResolvedValue({ id: "p1" }),
  };
  const groups = { planPay: vi.fn().mockResolvedValue({ valorCents: 5000 }), pay: vi.fn().mockResolvedValue({ id: "c1" }) };
  const groupModel = { findById: vi.fn().mockResolvedValue({ id: "c1" }) };
  const service = new PaymentService(model as never, provider, orders as never, groups as never, groupModel as never);
  return { service, model, orders, groups };
}

const corpo = { metodo: "PIX", itens: [{ tipo: "PEDIDO", loteId: "l1", quantidade: 1 }] };

describe("PaymentService", () => {
  it("modo simulado: aprova na hora e emite os ingressos", async () => {
    const { service, orders } = montar(new SimulatedProvider());

    const r = await service.create(corpo, ator);

    expect(r.status).toBe("APROVADO");
    expect(orders.create).toHaveBeenCalledOnce();
    expect(r.pedidos).toEqual([{ id: "p1" }]);
  });

  it("soma o valor de pedidos e cotas calculado no servidor", async () => {
    const { service, model } = montar(new SimulatedProvider());

    await service.create({ metodo: "PIX", itens: [corpo.itens[0], { tipo: "COTA", compraId: "c1" }] }, ator);

    expect(model.create.mock.calls[0][0].valor).toBe("162.50");
  });

  it("Mercado Pago: fica pendente com o Pix e só emite quando o provedor confirma", async () => {
    const provider: PaymentProvider = {
      nome: "MERCADOPAGO",
      criar: vi.fn().mockResolvedValue({ externoId: "99", pixCopiaECola: "000201..." }),
      consultar: vi.fn().mockResolvedValueOnce({ status: "PENDENTE" }).mockResolvedValueOnce({ status: "APROVADO", valor: 112.5 }),
      consultarNotificacao: vi.fn(),
    };
    const { service, orders } = montar(provider);

    const criado = await service.create(corpo, ator);
    expect(criado.status).toBe("PENDENTE");
    expect(criado.pixCopiaECola).toBe("000201...");
    expect(orders.create).not.toHaveBeenCalled();

    expect((await service.find("pg1", ator)).status).toBe("PENDENTE");
    expect((await service.find("pg1", ator)).status).toBe("APROVADO");
    expect(orders.create).toHaveBeenCalledOnce();
  });

  it("webhook e consulta ao mesmo tempo emitem os ingressos uma vez só", async () => {
    const provider: PaymentProvider = {
      nome: "MERCADOPAGO",
      criar: vi.fn().mockResolvedValue({ externoId: "99", pixCopiaECola: "x" }),
      consultar: vi.fn().mockResolvedValue({ status: "APROVADO", valor: 112.5 }),
      consultarNotificacao: vi.fn().mockResolvedValue({ pagamentoId: "pg1", status: "APROVADO", valor: 112.5 }),
    };
    const { service, orders } = montar(provider);
    await service.create(corpo, ator);

    await service.handleNotification("99");
    await service.handleNotification("99");
    await service.find("pg1", ator);

    expect(orders.create).toHaveBeenCalledOnce();
  });

  it("não aprova quando o valor pago é diferente do cobrado", async () => {
    const provider: PaymentProvider = {
      nome: "MERCADOPAGO",
      criar: vi.fn().mockResolvedValue({ externoId: "99" }),
      consultar: vi.fn(),
      consultarNotificacao: vi.fn().mockResolvedValue({ pagamentoId: "pg1", status: "APROVADO", valor: 1 }),
    };
    const { service, orders } = montar(provider);
    await service.create(corpo, ator);

    await service.handleNotification("99");

    expect(orders.create).not.toHaveBeenCalled();
  });

  it("Pix recusado marca o pagamento como recusado", async () => {
    const provider: PaymentProvider = {
      nome: "MERCADOPAGO",
      criar: vi.fn().mockResolvedValue({ externoId: "99" }),
      consultar: vi.fn().mockResolvedValue({ status: "RECUSADO" }),
      consultarNotificacao: vi.fn(),
    };
    const { service } = montar(provider);
    await service.create(corpo, ator);

    expect((await service.find("pg1", ator)).status).toBe("RECUSADO");
  });

  it("pagamento com prazo vencido vira EXPIRADO", async () => {
    const provider: PaymentProvider = { nome: "MERCADOPAGO", criar: vi.fn(), consultar: vi.fn(), consultarNotificacao: vi.fn() };
    const { service } = montar(provider, pagamento({ expiraEm: new Date(Date.now() - 1000) }));

    expect((await service.find("pg1", ator)).status).toBe("EXPIRADO");
    expect(provider.consultar).not.toHaveBeenCalled();
  });

  it("Pix pago depois de expirar ainda emite os ingressos", async () => {
    const provider: PaymentProvider = {
      nome: "MERCADOPAGO",
      criar: vi.fn(),
      consultar: vi.fn(),
      consultarNotificacao: vi.fn().mockResolvedValue({ pagamentoId: "pg1", status: "APROVADO", valor: 112.5 }),
    };
    const { service, orders } = montar(provider, pagamento({ status: "EXPIRADO" }));

    await service.handleNotification("99");

    expect(orders.create).toHaveBeenCalledOnce();
  });

  it("guarda o motivo quando algum item não pôde ser emitido", async () => {
    const { service, orders } = montar(new SimulatedProvider());
    orders.create.mockRejectedValue(Object.assign(new Error("x"), {}));

    const r = await service.create(corpo, ator);

    expect(r.status).toBe("APROVADO");
    expect(r.erroEmissao).toBeTruthy();
  });

  it("só o dono vê o pagamento", async () => {
    const { service } = montar(new SimulatedProvider());

    await expect(service.find("pg1", { id: "outro", papel: "CLIENTE" })).rejects.toMatchObject({ statusCode: 404 });
  });

  it.each([
    [{ metodo: "BOLETO", itens: corpo.itens }],
    [{ metodo: "PIX", itens: [] }],
    [{ metodo: "PIX", itens: [{ tipo: "OUTRO" }] }],
    [{ metodo: "PIX", itens: [{ tipo: "COTA" }] }],
  ])("rejeita corpo inválido %j", async (body) => {
    const { service } = montar(new SimulatedProvider());

    await expect(service.create(body, ator)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("MercadoPagoProvider", () => {
  const resposta = (corpo: unknown, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => corpo, text: async () => "erro" }) as Response;
  const cobranca = { id: "pg1", metodo: "PIX" as const, valor: 112.5, email: "a@b.com", expiraEm: new Date("2026-12-01T12:00:00Z") };

  it("cria o Pix com valor, referência, aviso e idempotência", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      resposta({ id: 77, status: "pending", point_of_interaction: { transaction_data: { qr_code: "COPIA", qr_code_base64: "QR" } } }),
    );
    const mp = new MercadoPagoProvider({ accessToken: "TEST-1", publicUrl: "https://api.x", fetchFn: fetchFn as never });

    const r = await mp.criar(cobranca);

    expect(r).toEqual({ externoId: "77", pixCopiaECola: "COPIA", pixQrCodeBase64: "QR" });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.mercadopago.com/v1/payments");
    expect(init.headers["X-Idempotency-Key"]).toBe("pg1");
    expect(init.headers.Authorization).toBe("Bearer TEST-1");
    expect(JSON.parse(init.body)).toMatchObject({
      transaction_amount: 112.5,
      payment_method_id: "pix",
      external_reference: "pg1",
      notification_url: "https://api.x/pagamentos/webhook/mercadopago",
      date_of_expiration: "2026-12-01T12:00:00.000+00:00",
    });
  });

  it("cartão: cria a preferência e usa o link de teste com credencial TEST-", async () => {
    const fetchFn = vi.fn().mockResolvedValue(resposta({ id: "pref1", init_point: "https://real", sandbox_init_point: "https://sandbox" }));

    const teste = new MercadoPagoProvider({ accessToken: "TEST-1", publicUrl: "https://api.x", fetchFn: fetchFn as never });
    expect((await teste.criar({ ...cobranca, metodo: "CARTAO" })).checkoutUrl).toBe("https://sandbox");

    const real = new MercadoPagoProvider({ accessToken: "APP_USR-1", publicUrl: "https://api.x", fetchFn: fetchFn as never });
    expect((await real.criar({ ...cobranca, metodo: "CARTAO" })).checkoutUrl).toBe("https://real");

    const corpoPref = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(corpoPref.items[0].unit_price).toBe(112.5);
    expect(corpoPref.external_reference).toBe("pg1");
    expect(corpoPref.back_urls.success).toBe("https://api.x/pagamentos/retorno?status=approved");
  });

  it("erro do Mercado Pago vira 502", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const mp = new MercadoPagoProvider({ accessToken: "TEST-1", publicUrl: "https://api.x", fetchFn: vi.fn().mockResolvedValue(resposta({}, false)) as never });

    await expect(mp.criar(cobranca)).rejects.toMatchObject({ statusCode: 502 });
  });

  it("consulta por external_reference e interpreta o estado", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(resposta({ results: [{ id: 1, status: "approved", transaction_amount: 112.5 }] }))
      .mockResolvedValueOnce(resposta({ results: [{ id: 2, status: "rejected" }] }))
      .mockResolvedValueOnce(resposta({ results: [{ id: 3, status: "rejected" }] }));
    const mp = new MercadoPagoProvider({ accessToken: "TEST-1", publicUrl: "https://api.x", fetchFn: fetchFn as never });

    expect(await mp.consultar("pg1", "PIX")).toEqual({ status: "APROVADO", valor: 112.5 });
    expect((await mp.consultar("pg1", "PIX")).status).toBe("RECUSADO");
    // No cartão o cliente pode tentar de novo no checkout.
    expect((await mp.consultar("pg1", "CARTAO")).status).toBe("PENDENTE");
    expect(fetchFn.mock.calls[0][0]).toContain("external_reference=pg1");
  });

  it("notificação devolve o id do nosso pagamento", async () => {
    const fetchFn = vi.fn().mockResolvedValue(resposta({ id: 5, status: "approved", transaction_amount: 10, external_reference: "pg1" }));
    const mp = new MercadoPagoProvider({ accessToken: "TEST-1", publicUrl: "https://api.x", fetchFn: fetchFn as never });

    expect(await mp.consultarNotificacao("5")).toEqual({ pagamentoId: "pg1", status: "APROVADO", valor: 10 });
  });
});

describe("rotas de pagamento", () => {
  beforeEach(() => resetPrismaMock());
  afterEach(() => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  });

  it("exige login para pagar e consultar", async () => {
    expect((await request(app).post("/pagamentos").send(corpo)).status).toBe(401);
    expect((await request(app).get("/pagamentos/pg1")).status).toBe(401);
  });

  it("o webhook é público e responde 200 mesmo sem dados úteis", async () => {
    expect((await request(app).post("/pagamentos/webhook/mercadopago").send({ type: "plan" })).status).toBe(200);
  });

  it("a página de retorno do checkout devolve ao app", async () => {
    const res = await request(app).get("/pagamentos/retorno?status=approved");

    expect(res.status).toBe(200);
    expect(res.text).toContain("groov://pagamento-retorno");
  });

  it("com Mercado Pago ligado, as rotas diretas de pedido e cota deixam de existir", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-1";
    const auth = logadoComo("CLIENTE", "u1");

    expect((await request(app).post("/pedidos").set(auth).send({ loteId: "l1", quantidade: 1 })).status).toBe(410);
    expect((await request(app).post("/grupos/compras/c1/pagar").set(auth)).status).toBe(410);
  });
});

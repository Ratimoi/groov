import { NextFunction, Request, Response, Router } from "express";
import { authenticate, getAuthUser } from "../middlewares/auth";
import { PaymentService } from "../services/PaymentService";

export const paymentService = new PaymentService();

const router = Router();

// Públicas: o Mercado Pago avisa por aqui e o checkout do cartão volta para cá.
// O aviso não é confiável por si só: o serviço sempre confere o pagamento no Mercado Pago.
router.post("/webhook/mercadopago", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipo = req.body?.type ?? req.query.type ?? req.query.topic;
    const id = req.body?.data?.id ?? req.query["data.id"] ?? req.query.id;
    if (tipo === "payment" && (typeof id === "string" || typeof id === "number")) {
      await paymentService.handleNotification(String(id));
    }
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

// Página que o checkout do cartão abre ao terminar: devolve o usuário ao app.
router.get("/retorno", (_req: Request, res: Response) => {
  res
    .status(200)
    .type("html")
    .send(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>Groov</title><meta http-equiv="refresh" content="0;url=groov://pagamento-retorno"></head>` +
        `<body style="font-family:sans-serif;background:#131313;color:#e5e2e1;text-align:center;padding:48px 24px">` +
        `<h2>Pagamento recebido</h2><p>Volte ao app do Groov para ver os seus ingressos.</p>` +
        `<p><a style="color:#ebb2ff" href="groov://pagamento-retorno">Abrir o Groov</a></p></body></html>`,
    );
});

router.post("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await paymentService.create(req.body, getAuthUser(req)));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json(await paymentService.find(req.params.id, getAuthUser(req)));
  } catch (error) {
    next(error);
  }
});

export default router;

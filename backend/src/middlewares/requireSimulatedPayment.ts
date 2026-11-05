import { NextFunction, Request, Response } from "express";
import { paymentsEnabled } from "../services/payments";
import { AppError } from "../utils/AppError";

// Com o Mercado Pago ligado, pedidos e cotas só saem pelo checkout (POST /pagamentos). As rotas
// diretas continuam existindo só no modo simulado (desenvolvimento e testes); senão dariam
// ingressos de graça.
export function requireSimulatedPayment(_req: Request, _res: Response, next: NextFunction): void {
  if (paymentsEnabled()) {
    next(new AppError("Pague pelo checkout: POST /pagamentos", 410));
    return;
  }
  next();
}

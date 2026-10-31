import express from 'express';
import cors from 'cors';

import prisma from './config/prisma';
import authRoutes from './routes/AuthRoutes';
import userRoutes from './routes/UserRoutes';
import groupRoutes from './routes/GroupRoutes';
import groupPurchaseRoutes from './routes/GroupPurchaseRoutes';
import eventRoutes from './routes/EventRoutes'
import lotRoutes from './routes/LotRoutes';
import orderRoutes from './routes/OrderRoutes';
import ticketRoutes from './routes/TicketRoutes';
import { authenticate } from './middlewares/auth';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Atrás do proxy do Render: sem isso todos os clientes teriam o mesmo IP (e o mesmo limite de login).
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/auth', authRoutes);
app.use('/usuarios', userRoutes);
// '/grupos/compras' precisa vir antes de '/grupos', senão '/grupos/:id' captura "compras" como id.
app.use('/grupos/compras', authenticate, groupPurchaseRoutes);
app.use('/grupos', authenticate, groupRoutes);
app.use('/eventos', eventRoutes)
app.use('/lotes', lotRoutes);
app.use('/pedidos', authenticate, orderRoutes);
app.use('/ingressos', authenticate, ticketRoutes);

app.use(errorHandler);

export default app;

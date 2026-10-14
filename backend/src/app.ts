import express from 'express';
import cors from 'cors';

import prisma from './config/prisma';
import userRoutes from './routes/UserRoutes';
import groupRoutes from './routes/GroupRoutes';
import groupPurchaseRoutes from './routes/GroupPurchaseRoutes';
import eventRoutes from './routes/EventRoutes'
import { errorHandler } from './middlewares/errorHandler';

const app = express();

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

app.use('/usuarios', userRoutes);
app.use('/grupos', groupRoutes);
app.use('/grupos/compras', groupPurchaseRoutes);
app.use('/eventos', eventRoutes)

app.use(errorHandler);

export default app;

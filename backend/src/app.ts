import express from 'express';
import cors from 'cors';

import prisma from './config/prisma';
import userRoutes from './routes/UserRoutes';
import groupRoutes from './routes/GroupRoutes';
import groupPurchaseRoutes from './routes/GroupPurchaseRoutes';
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

app.use('/users', userRoutes);
app.use('/groups', groupRoutes);
app.use('/group-purchases', groupPurchaseRoutes);

app.use(errorHandler);

export default app;

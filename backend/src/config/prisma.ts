const { PrismaClient } = require('@prisma/client');

// Instancia unica para todo o app: cada `new PrismaClient()` abre um pool de
// conexoes proprio, e o plano free do Neon tem limite baixo. O guard em
// globalThis evita que cada reload do nodemon acumule pools.
const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

module.exports = prisma;

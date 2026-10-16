import 'dotenv/config';
import app from './app';
import { assertAuthConfig } from './config/auth';

// Sem JWT_SECRET válido a API não sobe (melhor falhar no deploy do que em produção).
assertAuthConfig();

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

# Groov

Aplicativo de eventos e ingressos com compra em grupo. Usuários descobrem eventos, formam grupos e compram ingressos juntos.

## Stack

| Parte | Tecnologias |
|---|---|
| Backend | Node 24, Express 4, TypeScript, Prisma 6, PostgreSQL, Vitest |
| Frontend | React Native 0.86, Expo 57 (Expo Router), TypeScript, NativeWind (Tailwind CSS) |
| CI | GitHub Actions |

## Estrutura do projeto

```
groov/
├── backend/          # API Node.js + Express (TypeScript)
│   ├── prisma/             # schema.prisma e migrações do banco
│   ├── src/
│   │   ├── config/         # configurações (cliente Prisma)
│   │   ├── controllers/    # camada HTTP (recebe request, chama service)
│   │   ├── middlewares/    # middlewares Express (errorHandler)
│   │   ├── models/         # acesso a dados via Prisma
│   │   ├── repositories/   # reservado
│   │   ├── routes/         # definição das rotas
│   │   ├── services/       # regras de negócio
│   │   ├── types/          # tipos e DTOs
│   │   ├── utils/          # AppError, tratamento de erros do Prisma
│   │   ├── app.ts          # configuração do Express
│   │   └── server.ts       # ponto de entrada
│   └── tests/
└── frontend/         # App React Native + Expo (TypeScript)
    ├── assets/              # imagens, ícones, splash
    ├── app.json             # configuração do app (nome, ícone, plugins)
    ├── global.css           # diretivas do Tailwind
    ├── tailwind.config.js   # tema do NativeWind
    └── src/
        ├── app/             # telas e rotas (Expo Router: cada arquivo é uma tela)
        │   ├── _layout.tsx  # navegação raiz
        │   ├── index.tsx    # início
        │   ├── busca.tsx    # busca
        │   ├── grupos.tsx   # grupos
        │   └── perfil.tsx   # perfil
        ├── components/      # componentes reutilizáveis (ex.: NavBar)
        ├── constants/       # tema, cores e outras constantes
        ├── contexts/        # contextos React
        ├── hooks/           # hooks customizados
        ├── services/        # chamadas à API
        └── utils/           # funções utilitárias
```

## Como rodar

O projeto usa **Node 24**. Com o [nvm](https://github.com/nvm-sh/nvm), rode `nvm use` na raiz: a versão vem do `.nvmrc`.

### Backend

Precisa de um banco PostgreSQL. Preencha `DATABASE_URL` no `.env`.

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev   # aplica as migrações e gera o cliente Prisma
npm run dev              # roda o TypeScript direto e reinicia ao salvar
```

Outros scripts: `npm run build` compila para `dist/`, `npm start` roda o build, `npm run typecheck` checa os tipos e `npm test` roda os testes (Vitest + Supertest, sem precisar de banco).

Rotas disponíveis:

| Rota | Descrição |
|---|---|
| `GET /health`, `GET /health/db` | Saúde da API e da conexão com o banco |
| `/usuarios` | CRUD de usuários |
| `/grupos` | CRUD de grupos e gestão de membros (`/grupos/:id/members`) |
| `/grupos/compras` | Criação e consulta de compras em grupo |
| `/eventos` | Listagem paginada (`?page=1&limit=20`, máx. 100) e consulta de eventos (somente leitura) |

A listagem de eventos devolve `{ data, page, limit, total, totalPages }`, ordenada pela data de início. `page` e `limit` inválidos respondem 400.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env     # preencha as variáveis EXPO_PUBLIC_*
npx expo start
```

Outros scripts: `npm run android`, `npm run ios`, `npm run web`, `npm run lint` e `npm run typecheck`.

## Fluxo de contribuição

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para o padrão de branches e o pipeline de CI.

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

| Rota | Acesso | Descrição |
|---|---|---|
| `GET /health`, `GET /health/db` | público | Saúde da API e da conexão com o banco |
| `POST /auth/login` | público | Login com `{ email, senha }`; devolve `{ token, usuario }` |
| `GET /auth/me` | logado | Dados do usuário do token |
| `POST /usuarios` | público | Cadastro (sempre como `CLIENTE`) |
| `GET /usuarios` | ADMIN | Lista usuários |
| `GET, PUT, DELETE /usuarios/:id` | o próprio usuário ou ADMIN | Só um ADMIN altera `papel` |
| `POST /grupos`, `GET /grupos` | logado | Cria um grupo (o líder é você) e lista os grupos de que você participa |
| `GET /grupos/:id`, `GET /grupos/:id/members` | membros do grupo ou ADMIN | Quem não participa recebe 404 |
| `PUT, DELETE /grupos/:id`, `POST /grupos/:id/members` | líder do grupo ou ADMIN | Renomear, apagar e convidar membros |
| `DELETE /grupos/:id/members/:usuarioId` | líder, ADMIN ou o próprio membro | Remover alguém ou sair do grupo; o líder não pode ser removido |
| `POST /grupos/compras` | logado | Inicia uma compra em grupo (o iniciador é você e precisa ser membro do grupo) |
| `GET /grupos/compras`, `GET /grupos/compras/:id` | participantes da compra ou ADMIN | Lista só as suas; as demais respondem 404 |
| `GET /eventos`, `GET /eventos/:id` | público | Listagem paginada (`?page=1&limit=20`, máx. 100) e consulta de eventos |
| `POST /eventos` | PRODUTOR ou ADMIN | Cria um evento; o criador é o usuário logado |
| `PUT, DELETE /eventos/:id` | criador do evento ou ADMIN | Editar (só os campos enviados; `null` limpa os opcionais) e apagar. Evento com lotes ou pedidos não pode ser apagado (409) |

### Autenticação

O login devolve um token JWT, que deve ser enviado nas rotas protegidas no cabeçalho `Authorization: Bearer <token>`. O token vale 1 dia (`JWT_EXPIRES_IN`) e carrega só o id do usuário: o papel é lido do banco a cada requisição, então apagar ou rebaixar um usuário vale na hora. Rotas protegidas sem token válido respondem 401; sem permissão, 403. O login é limitado a 10 tentativas por IP a cada 15 minutos (429).

A API **não sobe** sem `JWT_SECRET` (mínimo 32 caracteres). Gere um com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Todo cadastro entra como `CLIENTE`. Para criar o primeiro `ADMIN`, cadastre o usuário normalmente e promova-o direto no banco (console SQL do Neon):

```sql
UPDATE "Usuario" SET papel = 'ADMIN' WHERE email = 'seu@email.com';
```

Campos de um evento: `titulo`, `cidade` e `comecaEm` (data ISO 8601, ex.: `2026-12-31T22:00:00Z`) são obrigatórios; `terminaEm`, `descricao`, `nomeLocal`, `imagemUrl` (http ou https) e `categoriaId` são opcionais. `terminaEm` não pode ser anterior a `comecaEm`.

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

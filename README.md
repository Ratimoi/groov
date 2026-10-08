# Groov

Sistema de gestão ágil.

## Estrutura do projeto

```
groov/
├── backend/          # API Node.js + Express (TypeScript)
│   ├── src/
│   │   ├── config/         # configurações (env, banco, etc.)
│   │   ├── controllers/    # camada HTTP (recebe request, chama service)
│   │   ├── middlewares/    # middlewares Express
│   │   ├── models/         # modelos/entidades
│   │   ├── repositories/   # acesso a dados
│   │   ├── routes/         # definição das rotas
│   │   ├── services/       # regras de negócio
│   │   ├── utils/          # funções utilitárias
│   │   ├── app.ts          # configuração do Express
│   │   └── server.ts       # ponto de entrada
│   ├── prisma/             # schema e migrações do banco
│   └── tests/
└── frontend/         # SPA React + Vite
    ├── public/
    └── src/
        ├── assets/          # imagens, ícones, etc.
        ├── components/      # componentes reutilizáveis
        ├── contexts/        # contextos React
        ├── hooks/           # hooks customizados
        ├── pages/           # páginas/telas
        ├── services/        # chamadas à API
        ├── styles/          # estilos globais
        ├── utils/           # funções utilitárias
        ├── App.jsx
        └── main.jsx
```

## Como rodar

O projeto usa **Node 24**. Com o [nvm](https://github.com/nvm-sh/nvm), rode `nvm use` na raiz: a versão vem do `.nvmrc`.

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev          # desenvolvimento: roda o TypeScript direto e reinicia ao salvar
```

Outros scripts: `npm run build` compila para `dist/`, `npm start` roda o build, `npm run typecheck` checa os tipos e `npm test` roda os testes.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Fluxo de contribuição

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para o padrão de branches e o pipeline de CI/CD.

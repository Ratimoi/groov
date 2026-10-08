# Groov

Sistema de gestão ágil.

## Estrutura do projeto

```
groov/
├── backend/          # API Node.js + Express
│   ├── src/
│   │   ├── config/         # configurações (env, banco, etc.)
│   │   ├── controllers/    # camada HTTP (recebe request, chama service)
│   │   ├── middlewares/    # middlewares Express
│   │   ├── models/         # modelos/entidades
│   │   ├── repositories/   # acesso a dados
│   │   ├── routes/         # definição das rotas
│   │   ├── services/       # regras de negócio
│   │   ├── utils/          # funções utilitárias
│   │   ├── app.js          # configuração do Express
│   │   └── server.js       # ponto de entrada
│   └── tests/
└── frontend/         # App React Native + Expo (TypeScript)
    ├── assets/              # imagens, ícones, splash
    ├── app.json             # configuração do app (nome, ícone, plugins)
    └── src/
        ├── app/             # telas e rotas (Expo Router: cada arquivo é uma tela)
        │   ├── _layout.tsx  # navegação raiz
        │   └── index.tsx    # tela inicial
        ├── components/      # componentes reutilizáveis
        ├── constants/       # tema, cores e outras constantes
        ├── contexts/        # contextos React
        ├── hooks/           # hooks customizados
        ├── services/        # chamadas à API
        └── utils/           # funções utilitárias
```

## Como rodar

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npx expo start
```

## Fluxo de contribuição

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para o padrão de branches e o pipeline de CI/CD.

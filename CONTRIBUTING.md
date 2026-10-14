# Fluxo de contribuição

## Branches permanentes

- `main` — código estável. Só recebe merge de `dev` via Pull Request, depois que a CI passar.
- `dev` — integração. Só recebe merge das branches de trabalho via Pull Request, depois que a CI passar.

## Branches de trabalho

Criadas a partir de `dev`, sempre com prefixo indicando o tipo:

| Prefixo | Uso |
|---|---|
| `feature/nome-da-feature` | Nova funcionalidade |
| `fix/nome-do-bug` | Correção de bug |
| `test/nome-do-teste` | Criação/ajuste de testes |
| `chore/nome` | Configuração, tooling, dependências, docs |
| `hotfix/nome` | Correção urgente, criada a partir de `main` |

Exemplos: `feature/login-usuario`, `fix/erro-listagem-grupos`, `chore/setup-eslint`.

Use `feature/` (e não `feat/`) e escreva o nome em minúsculas, com hífens.

## Fluxo padrão

```
feature/xxx ──PR──▶ dev ──PR──▶ main
   (CI)                (CI)        (CI)
```

1. Criar a branch a partir de `dev`:
   ```bash
   git checkout dev
   git pull
   git checkout -b feature/nome-da-feature
   ```
2. Commitar seguindo [Conventional Commits](https://www.conventionalcommits.org/):
   `feat: `, `fix: `, `test: `, `chore: `, `docs: `, `refactor: `.
3. Abrir Pull Request para `dev`. A CI roda automaticamente.
4. Após aprovação e CI verde, fazer o merge em `dev` e apagar a branch.
5. Periodicamente, abrir PR de `dev` para `main`. A CI roda de novo antes do merge.

Ainda não há etapa de deploy. Quando existir, ela deve ser disparada pelo merge em `main`.

## Hotfix

Para correções urgentes, criar `hotfix/nome` a partir de `main`, abrir PR direto para `main` e, depois do merge, sincronizar `dev` com `main`.

## CI

O workflow (`.github/workflows/ci.yml`) roda em todo PR e push para `dev` e `main`, com Node 24, e valida backend e frontend em jobs separados.

**Backend** (`backend/`)
- `npm ci`
- `npm test` (Vitest)
- `npm run build` (compila o TypeScript)

**Frontend** (`frontend/`)
- `npm ci`
- `npm run lint` (`expo lint`)
- `npm run typecheck` (`tsc --noEmit`)
- `npm run export:android` (build de verificação do bundle)

Para rodar as mesmas checagens localmente antes de abrir o PR, execute esses scripts dentro de cada pasta.

## Banco de dados

Mudanças no `backend/prisma/schema.prisma` precisam de uma migração versionada:

```bash
cd backend
npx prisma migrate dev --name descricao-da-mudanca
```

Commite a pasta gerada em `backend/prisma/migrations/` junto com o schema.

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

O deploy é disparado pelo push (merge) em `main`, depois que os jobs de backend e frontend passam. Veja a seção [Deploy](#deploy).

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

## Deploy

Os jobs de deploy só rodam em `push` na `main`, dependem da CI verde e usam o environment `production` do GitHub.

| Job | O que faz | Secrets necessários |
|---|---|---|
| Deploy - Migrações (Neon) | `npx prisma migrate deploy` no banco de produção | `DATABASE_URL` |
| Deploy - Frontend (EAS Update) | `eas update --branch production` (atualização OTA do app) | `EXPO_TOKEN`, `EXPO_PUBLIC_NEON_DATA_API_URL`, `EXPO_PUBLIC_NEON_AUTH_URL` |

Os secrets ficam em *Settings → Environments → production* do repositório.

O EAS Update exige configuração prévia do projeto no Expo, feita uma vez com a conta do time: `npx eas-cli init` e `npx eas-cli update:configure` dentro de `frontend/`, e commitar o `eas.json` e as alterações no `app.json` e no `package.json` (`expo-updates`). Sem isso o job de frontend falha.

O backend (API Express) ainda não tem job de deploy porque a hospedagem não foi definida; o Neon só hospeda o banco.

## Banco de dados

Mudanças no `backend/prisma/schema.prisma` precisam de uma migração versionada:

```bash
cd backend
npx prisma migrate dev --name descricao-da-mudanca
```

Commite a pasta gerada em `backend/prisma/migrations/` junto com o schema.

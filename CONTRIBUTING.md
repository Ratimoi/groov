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
- `npm run typecheck` (código e testes)
- `npm test` (Vitest + Supertest; o Prisma é substituído por um mock, então não precisa de banco)
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
| Deploy - API (Render) | Chama o deploy hook do Render, **depois** das migrações | `RENDER_DEPLOY_HOOK_URL` |
| Deploy - Frontend (EAS Update) | `eas update --branch production` (atualização OTA do app) | `EXPO_TOKEN` |

Os secrets ficam em *Settings → Environments → production* do repositório.

Variáveis `EXPO_PUBLIC_*` são embutidas no bundle do app em tempo de build. Hoje o frontend não usa nenhuma, então o deploy não as define. Quando o código passar a ler uma delas (como as do Neon Data API e Auth que estão no `frontend/.env.example`), cadastre-a como secret e passe-a no `env` do passo `eas update`.

O EAS Update exige configuração prévia do projeto no Expo, feita uma vez com a conta do time: `npx eas-cli init` e `npx eas-cli update:configure` dentro de `frontend/`, e commitar o `eas.json` e as alterações no `app.json` e no `package.json` (`expo-updates`). Sem isso o job de frontend falha.

### API no Render

A API Express roda no [Render](https://render.com); o Neon hospeda só o banco. O serviço é descrito em [`render.yaml`](render.yaml) e o auto-deploy do Render fica **desligado**: quem dispara o deploy é a CI, pelo deploy hook, e só depois de aplicar as migrações. Assim a API nova nunca sobe sobre um schema antigo.

Configuração feita uma vez:

1. No Render: *New → Blueprint*, apontando para este repositório. Ele lê o `render.yaml` e cria o serviço `groov-api`.
2. Preencher `DATABASE_URL` (connection string do Neon) quando o Render pedir.
3. No serviço: *Settings → Deploy Hook*, copiar a URL e cadastrá-la como secret `RENDER_DEPLOY_HOOK_URL` no environment `production` do GitHub.

O health check usa `GET /health`.

A API exige a variável `JWT_SECRET` (mínimo 32 caracteres) e não sobe sem ela. O `render.yaml` pede ao Render que gere um valor aleatório (`generateValue`). Se o deploy falhar no health check logo após esta mudança, confira em *Environment* do serviço se `JWT_SECRET` existe; se não, crie uma com um valor gerado como descrito no README. Trocar o segredo invalida todos os tokens emitidos.

## Versões

As versões seguem o [versionamento semântico](https://semver.org/lang/pt-BR/) e são nomeadas **`Vx.x.x`**, com V maiúsculo: `V1.0.0`, `V1.1.0`, `V1.1.1`.

| Parte | Quando sobe | Exemplo |
|---|---|---|
| `V`**x**`.0.0` | mudança que quebra o contrato da API ou do app | `V1.0.0` → `V2.0.0` |
| `Vx.`**x**`.0` | funcionalidade nova compatível | `V1.0.0` → `V1.1.0` |
| `Vx.x.`**x** | correção de bug | `V1.1.0` → `V1.1.1` |

- **Tag e release:** a versão é marcada com uma tag anotada `Vx.x.x` na `main`, depois do merge `dev → main`, e vira uma *Release* no GitHub com o mesmo título (`V1.0.0`).
- **`version` do app:** no `frontend/app.json` fica **sem o V** (`"version": "1.0.0"`), porque o Android e o EAS exigem número puro. Quem escreve `V` é só a tag, a release e a comunicação.
- **Atualizações OTA:** o `runtimeVersion` do app segue a `version`. Mudou dependência nativa? Suba a versão (ao menos a minor) e gere um build novo; só mudanças em JS/TS vão por EAS Update.

Para marcar uma versão, depois do merge em `main`:

```bash
git checkout main && git pull
git tag -a V1.0.0 -m "V1.0.0"
git push origin V1.0.0
```

## Gerar o APK (Android)

O perfil `preview` do `frontend/eas.json` gera um APK que se instala direto no aparelho, sem loja. É preciso estar logado no Expo (`npx eas-cli login`) e ter o código commitado:

```bash
cd frontend
npm run build:apk
```

Os builds do app são **só para Android**: o script já fixa `--platform android`, e o iOS não está configurado no projeto (não há `bundleIdentifier` nem conta Apple Developer). Não use `--platform all`.

O comando devolve um link; abra-o no celular e baixe o APK (é preciso permitir a instalação de apps de fontes desconhecidas). O build leva de 10 a 20 minutos no plano gratuito. O APK de `preview` recebe atualizações OTA do branch `preview` do EAS Update (`eas update --branch preview`), não do `production`.

## Banco de dados

Mudanças no `backend/prisma/schema.prisma` precisam de uma migração versionada:

```bash
cd backend
npx prisma migrate dev --name descricao-da-mudanca
```

Commite a pasta gerada em `backend/prisma/migrations/` junto com o schema.

**Nunca apague a pasta `backend/prisma/migrations/` nem use `prisma db push` para mudar o banco compartilhado.** Em produção, quem altera o banco é o `prisma migrate deploy`, que só aplica as migrações versionadas: coluna ou tabela nova no schema sem migração não chega à produção, e o app passa a consultar algo que não existe (erro 500). A CI protege isso: ela aplica as migrações num Postgres vazio e falha se o resultado diferir do `schema.prisma`.

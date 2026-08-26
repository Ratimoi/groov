# Fluxo de contribuição

## Branches permanentes

- `main` — código em produção. Só recebe merge de `dev` via Pull Request, depois que a CI passar.
- `dev` — integração contínua. Só recebe merge das branches de trabalho via Pull Request, depois que a CI passar.

## Branches de trabalho

Criadas a partir de `dev`, sempre com prefixo indicando o tipo:

| Prefixo | Uso |
|---|---|
| `feature/nome-da-feature` | Nova funcionalidade |
| `fix/nome-do-bug` | Correção de bug |
| `test/nome-do-teste` | Criação/ajuste de testes |
| `chore/nome` | Configuração, tooling, dependências, docs |
| `hotfix/nome` | Correção urgente, criada a partir de `main` |

Exemplos: `feature/login-usuario`, `fix/erro-listagem-sprints`, `chore/setup-eslint`.

## Fluxo padrão

```
feature/xxx ──PR──▶ dev ──PR──▶ main
   (CI)                (CI)         (CI + deploy)
```

1. Criar a branch a partir de `dev`:
   ```bash
   git checkout dev
   git pull
   git checkout -b feature/nome-da-feature
   ```
2. Commitar seguindo [Conventional Commits](https://www.conventionalcommits.org/):
   `feat: `, `fix: `, `test: `, `chore: `, `docs: `, `refactor: `.
3. Abrir Pull Request para `dev`. A CI (lint + testes + build) roda automaticamente.
4. Após aprovação e CI verde, merge em `dev` (squash merge, apagar a branch).
5. Periodicamente, abrir PR de `dev` para `main`. A CI roda de novo antes do merge — esse merge em `main` é o gatilho de deploy.

## Hotfix

Para correções urgentes em produção, criar `hotfix/nome` a partir de `main`, abrir PR direto para `main` e, depois do merge, sincronizar `dev` com `main`.

## Regras da CI

O workflow (`.github/workflows/ci.yml`) roda em todo PR e push para `dev` e `main`, e valida backend e frontend separadamente:
- instalação de dependências
- lint
- testes
- build

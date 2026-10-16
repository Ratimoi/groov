# API do Groov: guia para o frontend

Este documento descreve o que a API aceita e devolve hoje (branch `dev`). Ele foi escrito para quem constrói o app (Expo) e vai consumir a API. Quando algo mudar na API, atualize este arquivo no mesmo PR.

## Antes de tudo

| | |
|---|---|
| URL de produção | `https://groov-api.onrender.com` |
| Local | `http://localhost:3333` (veja o README para subir o backend) |
| Formato | JSON em tudo (`Content-Type: application/json` nas requisições com corpo) |
| CORS | liberado para qualquer origem |

**Atenção ao estado da produção:** no momento da escrita, as rotas que consultam o banco (`/eventos`, `/auth/login` etc.) respondem `500` na URL de produção; só `/health` funciona. Há um problema de configuração do banco no Render em investigação. Enquanto isso, desenvolva contra o **backend local**.

**Plano gratuito do Render:** depois de uns 15 minutos sem uso o serviço "dorme", e a primeira chamada pode levar cerca de 50 segundos. Mostre um indicador de carregamento e use um timeout generoso (60 s) na primeira requisição.

### Configurar a URL no app

O app lê `process.env.EXPO_PUBLIC_API_URL`. Defina **sem barra no final**:

```bash
# frontend/.env
EXPO_PUBLIC_API_URL=http://localhost:3333
```

- No celular físico ou emulador, `localhost` é o próprio aparelho. Use o IP da sua máquina na rede (ex.: `http://192.168.0.10:3333`); no emulador Android, `http://10.0.2.2:3333`.
- As variáveis `EXPO_PUBLIC_NEON_*` do `.env.example` **não são usadas** por nada. O app fala só com esta API, nunca direto com o banco.

## Convenções

**Datas** chegam como texto ISO 8601 (`"2026-12-01T22:00:00.000Z"`), não como `Date`. Converta com `new Date(texto)` ao exibir. Ao enviar, use também ISO 8601 (`2026-12-31T22:00:00Z`); outros formatos são recusados.

**Valores monetários** (`preco`, `descontoGrupo` no lote) chegam como **texto** (`"180.00"`), porque são `Decimal` no banco. Não some como `number` sem converter.

**Erros** têm sempre o formato `{ "message": "..." }`. Em alguns casos vêm campos extras (veja `409` abaixo). Mostre ou mapeie o `message`; ele já está em português na maioria dos casos.

| Status | Quando |
|---|---|
| `400` | Corpo ou parâmetros inválidos; `message` diz qual campo |
| `401` | Sem token, token inválido, expirado ou de usuário apagado |
| `403` | Logado, mas sem permissão para a ação |
| `404` | Não existe, **ou você não tem acesso** (grupos e compras de outros usuários respondem 404 de propósito) |
| `409` | Conflito: valor repetido (`fields` lista os campos), registro com dependências (`constraint`), estoque insuficiente, compra pendente |
| `429` | Muitas tentativas de login (10 por IP a cada 15 min) |
| `500` | Erro interno; a mensagem é genérica |

## Autenticação

1. `POST /auth/login` devolve um **token JWT**.
2. Envie em toda rota protegida: `Authorization: Bearer <token>`.
3. O token vale **1 dia**. Não existe refresh token nem logout no servidor: ao expirar (`401`), peça login de novo e descarte o token.
4. O papel do usuário (`CLIENTE`, `PRODUTOR`, `ADMIN`) é lido do banco a cada requisição. Não confie em papel guardado no app para liberar telas; use `GET /auth/me` para saber o papel atual.

**Guarde o token no `expo-secure-store`**, não no `AsyncStorage` (que não é criptografado).

### `POST /auth/login`

```json
// requisição
{ "email": "ana@example.com", "senha": "minha-senha-123" }

// 200
{
  "token": "eyJhbGciOi...",
  "usuario": {
    "id": "clx...", "nome": "Ana", "username": "ana", "avatarUrl": null,
    "email": "ana@example.com", "papel": "CLIENTE", "criadoEm": "2026-10-16T22:00:00.000Z"
  }
}
```

E-mail inexistente e senha errada dão o mesmo `401` (`"Credenciais inválidas"`), de propósito. `400` se faltar `email` ou `senha`. O e-mail é comparado exatamente como foi cadastrado (maiúsculas contam).

### `GET /auth/me`
Protegida. Devolve o `usuario` (mesmo formato acima). Use ao abrir o app para validar o token guardado e obter o papel atual.

### `POST /usuarios` (cadastro, público)

```json
// requisição: todos os campos de texto, avatarUrl opcional
{ "nome": "Ana", "username": "ana", "email": "ana@example.com", "senha": "minha-senha-123" }
// 201 → o usuário (sem senha)
```

- `senha`: mínimo **8 caracteres**.
- `username` e `email` são únicos: repetido dá `409` com `"fields": ["username"]` (ou `"email"`).
- Todo novo usuário é `CLIENTE`. Não dá para escolher o papel no cadastro.
- Depois do cadastro, faça o login (o cadastro não devolve token).

## Usuários

| Rota | Quem acessa |
|---|---|
| `GET /usuarios/:id` | o próprio usuário ou ADMIN |
| `PUT /usuarios/:id` | o próprio usuário ou ADMIN. Aceita `nome`, `username`, `email`, `avatarUrl`, `senha`; só ADMIN altera `papel` |
| `DELETE /usuarios/:id` | o próprio usuário ou ADMIN → `204` |
| `GET /usuarios` | só ADMIN |

A senha nunca é devolvida. Para trocar a senha, envie `senha` no `PUT`.

## Eventos

### `GET /eventos` (público, paginado)

Parâmetros opcionais: `?page=1&limit=20` (`limit` máximo 100; inválidos dão `400`).

```json
{
  "data": [
    {
      "id": "clx...", "titulo": "Neon Dreams", "descricao": null, "imagemUrl": "https://...",
      "comecaEm": "2026-12-01T22:00:00.000Z", "terminaEm": null,
      "nomeLocal": "Sector 7G", "cidade": "Recife",
      "categoriaId": null, "criadoPorId": "clx...",
      "criadoEm": "...", "atualizadoEm": "..."
    }
  ],
  "page": 1, "limit": 20, "total": 57, "totalPages": 3
}
```

- A lista vem em `resposta.data` (**não é um array direto**).
- Ordenada por data de início crescente (os mais antigos primeiro, inclusive eventos já passados). Ainda não há filtro por cidade, categoria ou data.
- Para carregar mais (scroll infinito): peça `page + 1` enquanto `page < totalPages`.
- Os eventos não trazem `categoria`, `lotes` nem preço. Hoje só existe o id da categoria.

### `GET /eventos/:id` (público)
Um evento, no mesmo formato. `404` com `{"message": "Event not found"}` se não existir.

### Escrita (`POST /eventos`, `PUT` e `DELETE /eventos/:id`)

Só `PRODUTOR` ou `ADMIN`; editar e apagar exigem ser o criador do evento (ADMIN edita qualquer um). Para `CLIENTE`, `403`.

- Obrigatórios no `POST`: `titulo`, `cidade`, `comecaEm`. Opcionais: `terminaEm`, `descricao`, `nomeLocal`, `imagemUrl` (só `http`/`https`), `categoriaId`.
- `terminaEm` não pode ser antes de `comecaEm`.
- No `PUT`, envie só o que mudou; `null` limpa um campo opcional.
- `DELETE` devolve `204`. Evento que já tem lotes ou pedidos dá `409`.

## Grupos

Todas as rotas exigem login. Quem **não participa** de um grupo recebe `404`, como se ele não existisse.

```json
// Grupo
{ "id": "clx...", "nome": "Rolê de sexta", "liderId": "clx...", "criadoEm": "..." }
```

| Rota | Quem | Observação |
|---|---|---|
| `POST /grupos` | qualquer logado | corpo `{ "nome": "..." }`. **Você vira o líder**; não envie `liderId` |
| `GET /grupos` | qualquer logado | lista só os grupos de que você participa (ADMIN vê todos) |
| `GET /grupos/:id` | membros e ADMIN | |
| `PUT /grupos/:id` | líder ou ADMIN | só `nome` muda |
| `DELETE /grupos/:id` | líder ou ADMIN | `204` |
| `GET /grupos/:id/members` | membros e ADMIN | |
| `POST /grupos/:id/members` | líder ou ADMIN | corpo `{ "usuarioId": "..." }`. Quem já é membro dá `409` |
| `DELETE /grupos/:id/members/:usuarioId` | líder, ADMIN ou o próprio membro | `204`. Um membro pode **sair sozinho**. O líder não pode ser removido (`400`) |

Membro (`GET /grupos/:id/members`):

```json
{
  "id": "clx...", "grupoId": "clx...", "usuarioId": "clx...", "entrouEm": "...",
  "usuario": { "id": "clx...", "nome": "Bia", "username": "bia", "avatarUrl": null }
}
```

Não existe ainda uma rota para **buscar usuários por nome ou username**: para convidar alguém é preciso saber o `id`. Se o app precisar dessa busca, peça ao backend.

## Compras em grupo

Todas exigem login.

| Rota | Quem |
|---|---|
| `POST /grupos/compras` | membro do grupo |
| `GET /grupos/compras` | lista só as compras de que você participa (ADMIN vê todas) |
| `GET /grupos/compras/:id` | participantes e ADMIN (os demais recebem `404`) |

```json
// POST /grupos/compras: o iniciador é você; não envie iniciadorId
{ "grupoId": "clx...", "loteId": "clx...", "participantesIds": ["clxBia...", "clxCa..."] }
```

Regras (`400`/`404`/`409` com `message` explicando):
- O lote precisa aceitar compra em grupo.
- O total de participantes **incluindo você** tem que ser exatamente o `tamanhoGrupo` do lote.
- Todos os participantes precisam ser membros do grupo.
- Ninguém pode já ter uma compra em grupo **pendente** para o mesmo evento (`409`).
- Se o lote não tiver ingressos suficientes: `409`.
- A compra expira depois de `prazoGrupoHoras` do lote (campo `expiraEm`).

Resposta `201` (e `GET`):

```json
{
  "id": "clx...", "grupoId": "...", "loteId": "...", "iniciadorId": "...",
  "status": "PENDENTE", "expiraEm": "...", "criadoEm": "...",
  "participantes": [
    { "id": "...", "compraGrupoId": "...", "usuarioId": "...", "status": "PENDENTE", "pedidoId": null,
      "usuario": { "id": "...", "nome": "Bia", "username": "bia", "avatarUrl": null } }
  ]
}
```

`status` da compra: `PENDENTE`, `CONFIRMADA`, `EXPIRADA`. `status` do participante: `PENDENTE`, `PAGO`, `REEMBOLSADO`.

**O que ainda não existe na API:**
- **Lotes não têm rota.** Não há como listar os lotes de um evento nem seus preços, nem criar lotes. Sem `loteId` o app não consegue iniciar uma compra em grupo. É a próxima peça do backend.
- Não há pagamento, confirmação da compra nem expiração automática: a compra nasce `PENDENTE` e fica assim.
- Categorias, pedidos e ingressos também não têm rota.

## Tipos TypeScript (sugestão)

Os tipos da branch `feat/integracao-back` espelham as tabelas do banco, e isso não bate com o que a API devolve. Pontos a corrigir ao aproveitá-los:

- **Datas são `string`**, não `Date`.
- **Valores monetários são `string`.**
- **`UsuarioType` não tem `senha`**: a API nunca a envia.
- **Relações são opcionais ou ausentes.** `EventoType` não traz `lotes`, `pedidos`, `ingressos`, `validacoes`, `categoria` nem `criadoPor`. Só os campos listados neste guia chegam; relações como `participantes[].usuario` aparecem apenas onde descritas aqui.
- A resposta de listagem de eventos é um envelope (`{ data, page, limit, total, totalPages }`).

```ts
export type Papel = "CLIENTE" | "PRODUTOR" | "ADMIN";

export type Usuario = {
  id: string; nome: string; username: string; avatarUrl: string | null;
  email: string; papel: Papel; criadoEm: string;
};

export type Evento = {
  id: string; titulo: string; descricao: string | null; imagemUrl: string | null;
  comecaEm: string; terminaEm: string | null; nomeLocal: string | null; cidade: string;
  categoriaId: string | null; criadoPorId: string | null; criadoEm: string; atualizadoEm: string;
};

export type Pagina<T> = { data: T[]; page: number; limit: number; total: number; totalPages: number };
```

## Exemplo mínimo de cliente

```ts
const API = process.env.EXPO_PUBLIC_API_URL;

async function api<T>(caminho: string, opcoes: RequestInit = {}, token?: string): Promise<T> {
  const resposta = await fetch(`${API}${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (resposta.status === 204) return undefined as T;
  const corpo = await resposta.json();
  if (!resposta.ok) throw new Error(corpo.message ?? "Erro na requisição");
  return corpo as T;
}

// Eventos da primeira página (rota pública)
const { data: eventos } = await api<Pagina<Evento>>("/eventos?page=1&limit=20");
```

Na `HomeScreen`, a chamada atual a `${apiUrl}/filmes` deve virar `/eventos`, e o resultado é lido de `.data`. Trate também o estado inicial vazio (`eventos[0]` não existe antes da resposta chegar).

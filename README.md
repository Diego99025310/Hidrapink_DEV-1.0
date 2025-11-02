# HidraPink Influence Manager (Sistema Novo)

Aplicacao full-stack que moderniza o backend e o frontend do gestor HidraPink, migrando o sistema original para Node.js + Express + Prisma + PostgreSQL com interface React + Tailwind. Este repositario consolida os modulos de autenticacao, termos de aceite, planner, scripts, vendas e gestao de influenciadoras em uma nova stack.

## Sumario
- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Configuracao](#configuracao)
  - [Variaveis de ambiente](#variaveis-de-ambiente)
  - [Instalacao de dependencias](#instalacao-de-dependencias)
  - [Banco de dados e seed](#banco-de-dados-e-seed)
- [Comandos principais](#comandos-principais)
- [Fluxo de autenticacao](#fluxo-de-autenticacao)
- [Principais modulos e endpoints](#principais-modulos-e-endpoints)
- [Boas praticas de desenvolvimento](#boas-praticas-de-desenvolvimento)

## Arquitetura
- **backend/**: API Express com Prisma e PostgreSQL. Contem rotas, controladores e servicos para autenticacao, planner, scripts, termos, vendas e influenciadoras.
- **frontend/**: Aplicacao React (Vite) estilizada com Tailwind. Recria as telas do sistema antigo (login, dashboard, planner, sales, terms, influencers).
- **package.json (raiz)**: scripts utilitarios para orquestrar frontend e backend simultaneamente via `concurrently`.

## Requisitos
- Node.js 18+ e npm.
- PostgreSQL 14+ (qualquer versao recente compatível com Prisma).
- Conta com privilegios para criar banco/schema definido em `DATABASE_URL`.

## Configuracao

### Variaveis de ambiente
Crie o arquivo `backend/.env` com as variaveis necessarias para o Prisma e JWT:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/hidrapink?schema=public"
JWT_SECRET="hidrapinksecret"

# Opcional: sobrescreva credenciais de seed
MASTER_EMAIL="master@hidrapink.com"
MASTER_PASSWORD="master123"
INFLUENCER_EMAIL="influencer@hidrapink.com"
INFLUENCER_PASSWORD="influencer123"
JWT_EXPIRATION="1d"
FRONTEND_ORIGIN="http://localhost:5173"
```

### Instalacao de dependencias
Instale os pacotes do monorepo e dos pacotes internos:

```bash
npm install                 # instala dependencias da raiz (concurrently)
npm install --prefix backend
npm install --prefix frontend
```

### Banco de dados e seed
Sincronize o schema Prisma com o banco e popule registros padrao:

```bash
# aplica o schema no banco
npm run db:push --prefix backend

# popula usuarios master e influencer (ou tras atualizacoes se ja existirem)
npm run db:seed --prefix backend
```

Credenciais geradas pelo seed (caso nao sobrescreva via variaveis):
- Master: `master@hidrapink.com` / `master123`
- Influencer: `influencer@hidrapink.com` / `influencer123`

## Comandos principais
```bash
# roda backend e frontend juntos (porta 3000 e 5173)
npm run dev

# inicia apenas o backend (nodemon)
npm run dev:backend

# inicia apenas o frontend (vite)
npm run dev:frontend

# builda o frontend para producao
npm run build --prefix frontend
```

## Fluxo de autenticacao
- A tela de `/login` chama `POST /api/login`. O backend retorna token JWT e dados do usuario, que sao armazenados no `localStorage`.
- `ProtectedRoute` garante que somente usuarios autenticados alcancem rotas internas e valida papeis (`master` ou `influencer`).
- Chamadas Axios utilizam `api` (`frontend/src/lib/api.js`) com interceptor que injeta o header `Authorization: Bearer <token>`.
- A rota `/api/me` permite recuperar o usuario logado para restaurar sessao se necessario.

## Principais modulos e endpoints
Backend exposto sob `http://localhost:3000`:

| Modulo | Endpoints principais |
| --- | --- |
| Autenticacao | `POST /api/login`, `GET /api/me`, `POST /api/register` (master) |
| Influencers | `GET /api/influencers`, `POST /api/influencers`, `PUT /api/influencers/:id`, `DELETE /api/influencers/:id`, `POST /api/influencers/:id/reset-password` |
| Planner | `GET /api/influencer/plan`, `POST /api/influencer/plan`, `PUT /influencer/plan/:id`, validacoes master |
| Scripts | CRUD em `/scripts` com middleware de aceite |
| Vendas | Recursos sob `/api/sales` (importacao, resumo, aprovacao) |
| Termos de aceite | `/api/verificar-aceite`, `/api/enviar-token`, `/api/validar-token`, download de contrato assinado |

Front-end consome estes endpoints pela instancia Axios (`frontend/src/lib/api.js`). O layout principal e implementado em `frontend/src/components/AppLayout.jsx`, com paginas em `frontend/src/pages/`.

## Boas praticas de desenvolvimento
- Utilize `npm run dev` na raiz para evitar discrepancias de ambiente entre frontend e backend.
- Antes de testar fluxos que dependem de banco, execute `npm run db:push --prefix backend` e `npm run db:seed --prefix backend`.
- Mantenha strings ASCII nos arquivos conforme convencao atual do projeto.
- Adicione comentarios curtos somente quando necessario para explicar regras de negocio.
- Validacoes manuais sugeridas:
  1. Login como master e acesso aos modulos de vendas e influenciadoras.
  2. Login como influencer e fluxo de termos de aceite.
  3. Planner: agendamento e atualizacao de planos.
  4. Importacao e aprovacao de vendas (cada etapa com Prisma transactions).

Com esse guia voce tera o ambiente configurado para evoluir o Sistema Novo da HidraPink com base nas funcionalidades ja migradas do sistema antigo.

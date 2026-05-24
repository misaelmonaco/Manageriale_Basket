# Manageriale Basket

Gestionale SaaS multi-tenant per societa' di basket. Il progetto contiene un frontend Next.js, un backend NestJS, un database PostgreSQL gestito con Prisma e pacchetti condivisi TypeScript.

## Prerequisiti

Prima di eseguire il programma installare:

- Node.js 22 o superiore
- pnpm 9.12.3 o superiore
- Docker Desktop, necessario per avviare PostgreSQL in locale
- Git, se il progetto viene scaricato da repository

Verificare le versioni:

```bash
node -v
pnpm -v
docker --version
```

Se pnpm non e' disponibile, abilitarlo con Corepack:

```bash
corepack enable
```

## Configurazione iniziale

1. Entrare nella cartella principale del progetto:

```bash
cd Manageriale_Basket
```

2. Installare le dipendenze del monorepo:

```bash
pnpm install
```

3. Creare i file ambiente partendo dagli esempi:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Su PowerShell, se `cp` non e' disponibile:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

4. Aprire `apps/api/.env` e verificare la variabile `DATABASE_URL`.

Per eseguire backend e frontend direttamente sul computer, usare:

```env
DATABASE_URL=postgresql://basket:basket@localhost:5432/basket?schema=public
```

Per eseguire l'API dentro Docker Compose, il servizio PostgreSQL si raggiunge invece con hostname `postgres`:

```env
DATABASE_URL=postgresql://basket:basket@postgres:5432/basket?schema=public
```

5. Verificare `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Esecuzione locale passo passo

### 1. Avviare PostgreSQL

Avviare solo il database:

```bash
docker compose up -d postgres
```

Controllare che il container sia attivo:

```bash
docker compose ps
```

Il database locale espone:

- host: `localhost`
- porta: `5432`
- database: `basket`
- utente: `basket`
- password: `basket`

### 2. Generare il client Prisma

```bash
pnpm db:generate
```

Questo comando genera il client Prisma usato dal backend per accedere al database.

### 3. Applicare le migrazioni

```bash
pnpm db:migrate
```

Questo comando crea o aggiorna le tabelle PostgreSQL in base allo schema in `apps/api/prisma/schema.prisma`.

### 4. Creare l'utente super admin

Lo script disponibile crea un account amministratore iniziale:

```powershell
cd apps/api
$env:DATABASE_URL="postgresql://basket:basket@localhost:5432/basket?schema=public"
node create-super-admin.cjs
cd ../..
```

Su macOS/Linux:

```bash
cd apps/api
DATABASE_URL="postgresql://basket:basket@localhost:5432/basket?schema=public" node create-super-admin.cjs
cd ../..
```

Credenziali create:

- email: `admin@basket.local`
- password: `Admin123!`
- ruolo: `SUPER_ADMIN`

### 5. Avviare frontend e backend

Dalla cartella principale:

```bash
pnpm dev
```

Turbo avvia i processi di sviluppo dei workspace:

- API NestJS su `http://localhost:4000`
- Web Next.js su `http://localhost:3000`

### 6. Aprire l'applicazione

Aprire nel browser:

```text
http://localhost:3000
```

La pagina di login e' disponibile su:

```text
http://localhost:3000/login
```

Usare le credenziali del super admin create nello step precedente.

## URL utili

- Frontend: `http://localhost:3000`
- API REST: `http://localhost:4000/api/v1`
- Swagger/OpenAPI: `http://localhost:4000/docs`
- Login: `http://localhost:3000/login`

## Esecuzione con Docker Compose

Per avviare database, API e frontend in container:

```bash
docker compose up --build
```

Servizi esposti:

- `web`: `http://localhost:3000`
- `api`: `http://localhost:4000`
- `postgres`: `localhost:5432`

Nota: il servizio `api` usa `apps/api/.env.example` come `env_file`, dove `DATABASE_URL` punta a `postgres`. Questa configurazione e' corretta dentro la rete Docker Compose.

Per fermare i container:

```bash
docker compose down
```

Per fermare i container ed eliminare anche il volume del database:

```bash
docker compose down -v
```

Usare `-v` solo se si vuole cancellare completamente il database locale.

## Comandi principali

```bash
pnpm dev
```

Avvia frontend e backend in modalita' sviluppo.

```bash
pnpm build
```

Compila tutti i workspace tramite Turbo.

```bash
pnpm lint
```

Esegue i controlli lint configurati nei workspace.

```bash
pnpm format
```

Formatta file TypeScript, Markdown, JSON e CSS con Prettier.

```bash
pnpm db:generate
```

Genera il client Prisma.

```bash
pnpm db:migrate
```

Applica le migrazioni Prisma in sviluppo.

## Architettura del progetto

Il repository e' un monorepo pnpm orchestrato con Turbo.

```text
Manageriale_Basket/
  apps/
    api/                 Backend NestJS
    web/                 Frontend Next.js
  packages/
    contracts/           Tipi TypeScript condivisi
    tsconfig/            Configurazioni TypeScript condivise
  docker-compose.yml     Servizi locali Docker
  pnpm-workspace.yaml    Definizione dei workspace pnpm
  turbo.json             Pipeline Turbo
```

### Backend: `apps/api`

Il backend e' una modular monolith NestJS. Espone API REST sotto il prefisso:

```text
/api/v1
```

Componenti principali:

- `src/main.ts`: bootstrap dell'app, CORS, Helmet, ValidationPipe e Swagger
- `src/app.module.ts`: modulo radice dell'applicazione
- `src/modules`: moduli funzionali del dominio
- `src/shared`: guardie, decoratori, RBAC, autenticazione e tenant context
- `src/prisma`: integrazione Prisma con NestJS
- `prisma/schema.prisma`: modello dati PostgreSQL
- `prisma/migrations`: migrazioni del database

Moduli backend:

- `auth`: login, registrazione, refresh token, logout, utente corrente
- `organizations`: gestione organizzazioni/tenant
- `teams`: squadre
- `players`: atleti e collegamenti con genitori
- `coaches`: allenatori e assegnazioni alle squadre
- `trainings`: allenamenti
- `matches`: partite
- `payments`: pagamenti
- `expenses`: spese
- `notifications`: notifiche
- `documents`: metadati documenti

### Frontend: `apps/web`

Il frontend usa Next.js App Router.

Componenti principali:

- `src/app`: route e pagine dell'applicazione
- `src/app/(auth)/login/page.tsx`: pagina di login
- `src/app/dashboard`: area gestionale autenticata
- `src/components`: shell applicativa, componenti UI e tabelle
- `src/lib/api.ts`: client per chiamare le API backend
- `src/lib/navigation.ts`: configurazione navigazione dashboard

Route principali:

```text
/login
/dashboard
/dashboard/organizations
/dashboard/teams
/dashboard/players
/dashboard/coaches
/dashboard/calendar
/dashboard/matches
/dashboard/payments
/dashboard/expenses
/dashboard/documents
```

### Pacchetti condivisi

`packages/contracts` contiene tipi TypeScript condivisi tra frontend e backend, ad esempio ruoli utente e struttura della sessione autenticata.

`packages/tsconfig` contiene preset TypeScript comuni per mantenere configurazioni coerenti tra app e pacchetti.

## Modello dati e multi-tenancy

Il database e' PostgreSQL. Prisma definisce entita' come `Organization`, `User`, `Team`, `Player`, `Coach`, `Training`, `Match`, `Payment`, `Expense`, `Notification` e `Document`.

Le tabelle di dominio contengono `organizationId`, usato per isolare i dati tra societa' diverse. Gli utenti non super admin operano nel tenant indicato dal proprio JWT. Gli utenti `SUPER_ADMIN`, quando lavorano su dati tenant-specifici, possono passare l'header:

```text
x-organization-id
```

## Autenticazione e ruoli

L'autenticazione usa JWT access token e refresh token. I ruoli principali sono:

- `SUPER_ADMIN`: gestione piattaforma e organizzazioni
- `DIRECTOR`: gestione societa', squadre, atleti e finanze
- `COACH`: gestione allenamenti, partite e visibilita' atleti
- `PLAYER`: accesso ad allenamenti, partite, pagamenti e documenti personali
- `PARENT`: accesso alle informazioni dei figli collegati

Le route backend sono protette da guardie JWT e RBAC.

## Risoluzione problemi comuni

Se `pnpm db:migrate` non riesce a connettersi al database, controllare che PostgreSQL sia attivo:

```bash
docker compose ps
```

Controllare anche che `apps/api/.env` usi `localhost` quando i comandi vengono lanciati dal computer host.

Se la web app non riesce a chiamare l'API, verificare:

- backend attivo su `http://localhost:4000`
- `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`
- `FRONTEND_URL=http://localhost:3000` in `apps/api/.env`

Se le porte sono gia' occupate, chiudere il processo che le usa oppure cambiare `PORT` per l'API e aggiornare `NEXT_PUBLIC_API_URL` nel frontend.

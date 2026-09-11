# Production Architecture

## Monorepo Layout

```text
apps/
  api/                    NestJS modular monolith
    prisma/schema.prisma  PostgreSQL schema and tenant-owned entities
    src/
      modules/            MVC feature modules
      prisma/             Prisma client lifecycle
      shared/             Auth decorators, guards, RBAC, tenant context
  web/                    Next.js 15 App Router frontend
    src/app/              Route groups and dashboard pages
    src/components/       shadcn/ui-style primitives and app shell
    src/lib/              API client, navigation, utilities
packages/
  contracts/              Shared TypeScript role/session contracts
  tsconfig/               Shared TS compiler presets
```

## Backend Modules

- `Auth`: login, refresh-token rotation, logout, current user
- `Organizations`: tenant provisioning for `SUPER_ADMIN`
- `Teams`: team CRUD entry points with Prisma repository
- `Players`: player records and parent links with Prisma repository
- `Coaches`: coach records and team assignments
- `Trainings`: coach-managed team training schedules
- `Matches`: coach-managed fixtures and results
- `Payments`: director-managed player receivables
- `Expenses`: director-managed operating costs
- `Mail`: transport-agnostic sender (HTTP provider or SMTP) plus shared templates
- `Notifications`: role-scoped club messages
- `Documents`: tenant-scoped document metadata

## Tenant Isolation

Every business table contains `organizationId`. Non-super-admin users are scoped from their JWT claim. `SUPER_ADMIN` requests must pass `x-organization-id` when accessing tenant data. The `TenantMiddleware` stores tenant hints in `AsyncLocalStorage`, and `TenantService` resolves the effective organization for services.

## RBAC

Routes use `@Roles(...)` plus global `JwtAuthGuard` and `RolesGuard`.

- `SUPER_ADMIN`: platform-wide administration and tenant provisioning
- `DIRECTOR`: organization management, teams, players, finances
- `COACH`: trainings, matches, player visibility
- `PLAYER`: schedules, matches, own payments/documents
- `PARENT`: minor-player schedules, payments, documents

## Initial API Surface

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me

GET  /api/v1/organizations
POST /api/v1/organizations
GET  /api/v1/organizations/:id

GET  /api/v1/teams
POST /api/v1/teams
GET  /api/v1/players
POST /api/v1/players
GET  /api/v1/coaches
POST /api/v1/coaches
GET  /api/v1/trainings
POST /api/v1/trainings
GET  /api/v1/matches
POST /api/v1/matches
GET  /api/v1/payments
POST /api/v1/payments
POST /api/v1/payments/reminders/run   (x-cron-secret, external scheduler)
GET  /api/v1/expenses
POST /api/v1/expenses
GET  /api/v1/notifications
POST /api/v1/notifications
GET  /api/v1/documents
POST /api/v1/documents
```

## Frontend Routes

```text
/login
/register
/verify-email
/forgot-password
/reset-password
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

## Email

`MailService` picks its transport from configuration: an HTTP provider when `RESEND_API_KEY` is set, SMTP otherwise, forced either way by `MAIL_PROVIDER`. HTTP is the default because most PaaS free tiers block outbound SMTP ports (Render blocks 25/465/587 on free instances), where nodemailer can only time out. Bodies live in `mail.templates.ts` so every message shares one layout.

Flows: email verification, password reset, organization/team assignment, and payment reminders. Delivery failures are logged and never roll back the operation that triggered them.

Payment reminders run through `POST /payments/reminders/run`, authenticated with `CRON_SECRET` via the `x-cron-secret` header and driven by an external scheduler, so no in-process scheduler is needed. `Payment.remindedAt` stops a daily schedule from mailing the same families every day.

## Request Hardening

- `validateEnv` rejects missing, placeholder, duplicated or short JWT secrets at boot
- `RateLimitGuard` throttles the unauthenticated auth routes per IP (and per email on login/resend)
- CORS accepts `FRONTEND_URL`, `CORS_ORIGINS` and the subdomains of `CORS_ALLOWED_HOSTS` only
- Swagger at `/docs` is disabled in production unless `SWAGGER_ENABLED=true`
- Verification emails honour `EMAIL_VERIFICATION_COOLDOWN_MINUTES` on both login and resend
- `PLAYER` and `PARENT` only read the payments of their own (or their children's) player profile

## Operations

- `GET /api/v1/health` is a liveness probe; `GET /api/v1/health/ready` also pings the database and reports the active mail transport, answering 503 when Postgres is unreachable
- `AllExceptionsFilter` is the single error exit point: it maps Prisma failures to HTTP codes (P2002 conflict, P2003 bad request, P2025 not found), logs 5xx with a stack, and never returns an internal message
- `RequestLoggingInterceptor` logs one line per request (method, path, status, duration), skipping health probes
- Migrations are applied with `pnpm --filter @basket/api prisma:deploy` (`prisma migrate deploy`); `prisma:migrate` is the development-only command and must never run against production
- CI (`.github/workflows/ci.yml`) generates the Prisma client, type-checks, runs the API test suite and builds both apps

## Testing

`pnpm --filter @basket/api test` runs Jest over the units where a regression would be a security bug: tenant resolution, RBAC, rate limiting and payment ownership filters. They use hand-built fakes instead of a live database, so they need no running Postgres.

## Production Hardening To Add Next

- Seed script for first `SUPER_ADMIN`
- Email delivery webhooks (bounces, complaints) once the provider is live
- Full update/delete controllers with audit logging
- Row-level ownership filters for the remaining player/parent visible resources
- File storage adapter for documents
- E2E tests covering the full auth and tenant-isolation flows against a real database
- ESLint configuration: both `lint` scripts are declared but no config or dependency exists yet
- Refresh-token storage in httpOnly cookies if the deployment allows same-site frontend/API hosting
- Shared (Redis) rate-limit store once the API runs on more than one instance

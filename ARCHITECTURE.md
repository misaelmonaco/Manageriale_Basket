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

GET    /api/v1/{teams,players,coaches,trainings,matches,expenses}
POST   /api/v1/{teams,players,coaches,trainings,matches,expenses}
GET    /api/v1/{teams,players,coaches,trainings,matches}/:id
PATCH  /api/v1/{teams,players,coaches,trainings,matches,expenses}/:id
DELETE /api/v1/{teams,players,coaches,trainings,matches,expenses}/:id
GET  /api/v1/payments
POST /api/v1/payments
POST /api/v1/payments/reminders/run   (x-cron-secret, external scheduler)
GET    /api/v1/notifications
POST   /api/v1/notifications
DELETE /api/v1/notifications/:id
GET    /api/v1/documents
POST   /api/v1/documents
DELETE /api/v1/documents/:id
```

## Frontend Session

`src/lib/session.ts` owns the stored session: every read and write is guarded, because the accessors run during SSR and throw outright in a browser with site data blocked.

`apiFetch` rotates the token pair on a 401 and replays the original request, so a 15-minute access token does not interrupt work in progress. The rotation is shared across concurrent callers: the API revokes a refresh token when it is used, so parallel refreshes would invalidate each other. Auth routes are excluded to keep the retry from recursing. When the refresh itself fails the session is cleared and the user is sent to `/login`.

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

Flows: email verification, password reset, organization/team assignment, and payment reminders. Delivery failures are logged and never roll back the operation that triggered them, and every failure carries the provider's own reason rather than a bare boolean.

Two `SUPER_ADMIN` endpoints diagnose delivery without registering a throwaway account: `GET /health/mail` opens the SMTP connection (or validates the API key) and reports the raw error, and `POST /health/mail/test` sends a real message to a given address. An `ETIMEDOUT` on an SMTP port means the host blocks outbound SMTP, which configuration cannot fix.

`isEmailVerificationRequired` is shared between the auth flow and `/health/ready`, so the reported state can never drift from the enforced one. When it is false and delivery fails, accounts are verified automatically to avoid locking users out — `/health/ready` reports this explicitly because it is easy to leave switched on while debugging.

Payment reminders run through `POST /payments/reminders/run`, authenticated with `CRON_SECRET` via the `x-cron-secret` header and driven by an external scheduler, so no in-process scheduler is needed. `Payment.remindedAt` stops a daily schedule from mailing the same families every day.

## Request Hardening

- `validateEnv` rejects missing, placeholder, duplicated or short JWT secrets at boot
- `RateLimitGuard` throttles the unauthenticated auth routes per IP (and per email on login/resend)
- CORS accepts `FRONTEND_URL`, `CORS_ORIGINS` and the subdomains of `CORS_ALLOWED_HOSTS` only
- Swagger at `/docs` is disabled in production unless `SWAGGER_ENABLED=true`
- Verification emails honour `EMAIL_VERIFICATION_COOLDOWN_MINUTES` on both login and resend
- `PLAYER` and `PARENT` only read the payments of their own (or their children's) player profile

## Operations

- `GET /api/v1/health` is a liveness probe; `GET /api/v1/health/ready` also pings the database and reports the mail transport, the effective `NODE_ENV` and whether email verification is enforced, answering 503 when Postgres is unreachable
- `AllExceptionsFilter` is the single error exit point: it maps Prisma failures to HTTP codes (P2002 conflict, P2003 bad request, P2025 not found), logs 5xx with a stack, and never returns an internal message
- `RequestLoggingInterceptor` logs one line per request (method, path, status, duration), skipping health probes
- The first administrator is bootstrapped by `pnpm --filter @basket/api seed:super-admin`, which is idempotent: it skips once a `SUPER_ADMIN` exists and never overwrites a password unless `SUPER_ADMIN_RESET=true`, so it can stay in the deploy pipeline
- Migrations are applied with `pnpm --filter @basket/api prisma:deploy` (`prisma migrate deploy`); `prisma:migrate` is the development-only command and must never run against production
- CI (`.github/workflows/ci.yml`) generates the Prisma client, type-checks, runs the API test suite and builds both apps

## Testing

`pnpm --filter @basket/api test` runs Jest over the units where a regression would be a security bug: tenant resolution, RBAC, rate limiting and payment ownership filters. They use hand-built fakes instead of a live database, so they need no running Postgres.

## Production Hardening To Add Next

- Email delivery webhooks (bounces, complaints) once the provider is live
- Audit logging for the update and delete endpoints
- Row-level ownership filters for the remaining player/parent visible resources
- File storage adapter for documents
- E2E tests covering the full auth and tenant-isolation flows against a real database
- ESLint configuration: both `lint` scripts are declared but no config or dependency exists yet
- Refresh-token storage in httpOnly cookies if the deployment allows same-site frontend/API hosting
- Shared (Redis) rate-limit store once the API runs on more than one instance

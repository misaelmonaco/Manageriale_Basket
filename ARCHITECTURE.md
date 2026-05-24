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

## Production Hardening To Add Next

- Seed script for first `SUPER_ADMIN`
- Full update/delete controllers with audit logging
- Row-level ownership filters for player/parent payment visibility
- File storage adapter for documents
- E2E tests for auth, RBAC, and tenant isolation
- Refresh-token storage in httpOnly cookies if the deployment allows same-site frontend/API hosting

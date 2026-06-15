# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Repository Layout

Two independent Turborepo + pnpm monorepos live side by side:

```
DA2/
  lishop-backend/     # NestJS API monorepo
    apps/api/         # Main NestJS app (port 4000)
    packages/
      config/         # Shared ESLint/TS config
      contracts/      # Shared enums & types (UserRole, etc.)
      database/       # Prisma client singleton + migrations
  lishop-frontend/    # Next.js MFE monorepo
    apps/
      shell/          # App shell + header (port 3010)
      mfe-auth/       # Login, register (port 3001)
      mfe-catalog/    # Products, search (port 3002)
      mfe-cart/       # Cart (port 3003)
      mfe-checkout/   # Checkout flow (port 3004)
      mfe-orders/     # Order history + detail (port 3005)
      mfe-profile/    # User profile + loyalty points (port 3006)
      mfe-promotions/ # Flash sales + coupons (port 3007)
      mfe-notifications/ # Notification feed + preferences (port 3008)
      mfe-admin/      # Admin dashboard (port 3009)
    packages/
      shared/         # formatVND, cn, shared utils
      contracts/      # Shared TypeScript types
      event-bus/      # Cross-MFE event bus
      ui/             # Shared design system
      config/         # Shared ESLint/TS/Tailwind config
```

Each monorepo has its **own** `pnpm-workspace.yaml` and `turbo.json`. Commands must be run from the correct root (`lishop-backend/` or `lishop-frontend/`).

---

## Running The Source Code

Run backend and frontend from their own monorepo roots. Do not run `pnpm`
commands from `DA2/` because `lishop-backend/` and `lishop-frontend/` each have
their own `pnpm-workspace.yaml`, `turbo.json`, dependencies, and scripts.

### Prerequisites

- Node.js `>=20`
- pnpm `>=9`
- Docker Desktop, used for backend infrastructure services

Install dependencies once in each monorepo:

```bash
cd lishop-backend
pnpm install

cd ../lishop-frontend
pnpm install
```

### Backend (`lishop-backend`)

The backend is a NestJS API running on `http://localhost:4000`. It needs
Postgres, Redis, and Meilisearch from `docker-compose.yml`.

1. Create the backend env file if it does not exist:

```bash
cd lishop-backend
cp .env.example .env
```

For local Docker Compose, make sure these values match the repository defaults:

```env
PORT=4000
DATABASE_URL=postgresql://lishop:lishop@localhost:5439/lishop_dev
REDIS_URL=redis://localhost:6380
```

2. Start infrastructure services:

```bash
docker-compose up -d
```

This starts:

- Postgres: `localhost:5439`, database `lishop_dev`
- Redis: `localhost:6380`
- Meilisearch: `localhost:7700`

3. Generate Prisma client, run migrations, and seed demo data:

```bash
pnpm --filter @lishop/database db:generate
pnpm --filter @lishop/database db:migrate
pnpm --filter @lishop/database db:seed
```

4. Start the API in watch mode:

```bash
pnpm dev
```

Useful backend commands:

```bash
pnpm test
pnpm --filter @lishop/api test -- --no-coverage
pnpm --filter @lishop/api test -- --testPathPattern=orders.service.spec --no-coverage
pnpm --filter @lishop/api type-check
pnpm --filter @lishop/database db:studio
```

### Frontend (`lishop-frontend`)

The frontend is a Next.js micro-frontend monorepo. The shell runs on
`http://localhost:3010`; each MFE runs on its own port.

1. Create the frontend env file if it does not exist:

```bash
cd lishop-frontend
cp .env.example .env
```

Use these local URLs:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SHELL_URL=http://localhost:3010
NEXT_PUBLIC_MFE_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_MFE_CATALOG_URL=http://localhost:3002
NEXT_PUBLIC_MFE_CART_URL=http://localhost:3003
NEXT_PUBLIC_MFE_CHECKOUT_URL=http://localhost:3004
NEXT_PUBLIC_MFE_ORDERS_URL=http://localhost:3005
NEXT_PUBLIC_MFE_PROFILE_URL=http://localhost:3006
NEXT_PUBLIC_MFE_PROMOTIONS_URL=http://localhost:3007
NEXT_PUBLIC_MFE_NOTIFICATIONS_URL=http://localhost:3008
NEXT_PUBLIC_MFE_ADMIN_URL=http://localhost:3009
```

2. Start all frontend apps concurrently:

```bash
pnpm dev
```

Frontend ports:

| App | Package | URL |
| --- | --- | --- |
| Shell | `@lishop/shell` | `http://localhost:3010` |
| Auth | `@lishop/mfe-auth` | `http://localhost:3001` |
| Catalog | `@lishop/mfe-catalog` | `http://localhost:3002` |
| Cart | `@lishop/mfe-cart` | `http://localhost:3003` |
| Checkout | `@lishop/mfe-checkout` | `http://localhost:3004` |
| Orders | `@lishop/mfe-orders` | `http://localhost:3005` |
| Profile | `@lishop/mfe-profile` | `http://localhost:3006` |
| Promotions | `@lishop/mfe-promotions` | `http://localhost:3007` |
| Notifications | `@lishop/mfe-notifications` | `http://localhost:3008` |
| Admin | `@lishop/mfe-admin` | `http://localhost:3009` |

To run only one frontend app:

```bash
pnpm --filter @lishop/shell dev
pnpm --filter @lishop/mfe-catalog dev
pnpm --filter @lishop/mfe-admin dev
```

Useful frontend commands:

```bash
pnpm type-check
pnpm --filter @lishop/mfe-admin type-check
pnpm build
pnpm e2e:checkout
```

### Recommended Local Startup Order

1. In `lishop-backend/`, run `docker-compose up -d`
2. In `lishop-backend/`, run database setup commands if this is the first run
3. In `lishop-backend/`, run `pnpm dev`
4. In `lishop-frontend/`, run `pnpm dev`
5. Open `http://localhost:3010`

---

## Backend Architecture

### Module Pattern

Every domain follows a strict three-layer pattern:

```
modules/<domain>/
  dto/                  # class-validator DTOs
  <domain>.repository.ts   # All Prisma access; no business logic
  <domain>.service.ts      # Business logic; depends on repository
  <domain>.service.spec.ts # Unit tests (mock repository)
  <domain>.controller.ts   # HTTP; calls service only
  <domain>.module.ts       # NestJS module wiring
```

**Repository** — raw Prisma queries, no exceptions thrown.  
**Service** — throws `NotFoundException`, `ForbiddenException`, `ConflictException`, etc.  
**Controller** — parameter extraction, guard application, delegates to service.

### Key Infrastructure

- **Prisma singleton**: `import { prisma } from '@lishop/database'` — use this everywhere, never `new PrismaClient()`
- **JWT**: `jose` v4 — `jwtVerify` / `new SignJWT(...)`. Access token in httpOnly cookie `lishop_at`; refresh token in httpOnly cookie `refresh_token`
- **Auth session cookie**: `lishop_session` — frontend MFEs use this readable, non-sensitive cookie as the logged-in signal
- **Redis**: via `RedisService` (ioredis wrapper) — cart data, token blacklist, reset tokens
- **Response envelope**: `TransformInterceptor` wraps all responses as `{ data: T, statusCode, timestamp }`. Frontend always reads `json.data ?? json`
- **Validation**: global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`
- **Rate limiting**: global 100 req/min via `@nestjs/throttler`

### Common Decorators

```typescript
@Public()                    // Bypass JwtAuthGuard (auth module decorator)
@Roles(UserRole.ADMIN)       // RBAC; must combine with RolesGuard
@CurrentUser('id')           // Extract userId from JWT payload
```

### Shared Enums (from `@lishop/database`)

```typescript
OrderStatus: PENDING | PROCESSING | SHIPPED | DELIVERED | CANCELLED | REFUNDED
CouponType:  PERCENT | FIXED | FREE_SHIPPING
```

```typescript
UserRole: CUSTOMER | ADMIN   // from @lishop/contracts
```

### Side-effect Pattern

Notification calls from core operations must be fire-and-forget to prevent notification failures from aborting the primary operation:

```typescript
this.notifRepo.createNotification(...).catch((err: unknown) =>
  console.error('[OrdersService] notification failed', err)
);
```

### NotificationsModule

Exports `NotificationsRepository`. Any module that needs to create notifications must import `NotificationsModule` and inject `NotificationsRepository` directly.

---

## Frontend Architecture

### MFE Communication

- **Shared auth state**: Zustand store (`useAuthStore`) in the shell, consumed via `useAuth()` hook
- **Cross-MFE navigation**: plain `<a href="http://localhost:{port}/path">` or `window.location` — no Next.js `Link` across MFE boundaries
- **Event bus**: `@lishop/event-bus` for cross-MFE events (e.g., `AUTH_LOGIN`, `CART_UPDATED`)

### Per-MFE Structure

Each MFE is a standalone Next.js 15 App Router app with its own:
- `src/app/providers.tsx` — `QueryClientProvider` wrapper
- `src/app/layout.tsx` — wraps children with `<Providers>`
- `src/lib/<domain>-api.ts` — typed `apiFetch` wrapper that sends auth cookies with `credentials: 'include'`

### Data Fetching Pattern

All MFEs use TanStack Query v5:

```typescript
async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}
```

Mutations that update cached data follow the pattern: `onSuccess: () => queryClient.invalidateQueries(...)`. Optimistic updates use `onMutate` / `onError` / `onSettled`.

### Shared Packages

- `@lishop/shared` — `formatVND(amount: number): string`, `cn(...classes)`
- `@lishop/contracts` — `UserRole` enum, shared response types
- `@lishop/event-bus` — `emit(event, payload)` / `on(event, handler)`

---

## Testing

Backend tests are **unit tests only** — repositories are mocked, no DB connection required. Follow TDD: write spec first, confirm FAIL, implement, confirm PASS.

```typescript
// Standard mock pattern
const repo = {
  findById: jest.fn(),
  create: jest.fn(),
};
// In beforeEach:
{ provide: SomeRepository, useValue: repo }
// After each:
afterEach(() => jest.resetAllMocks());
```

For atomic ownership-safe DB updates, prefer `updateMany({ where: { id, userId } })` over `findFirst` + `update` (eliminates TOCTOU race).

---

## Database

Migrations live in `lishop-backend/packages/database/prisma/migrations/`. After editing `schema.prisma`, always run:

```bash
pnpm --filter @lishop/database db:generate   # Regenerate client types
pnpm --filter @lishop/database db:migrate    # Create and apply migration
```

Docker Compose starts Postgres on **port 5439** (mapped to container 5432), database name `lishop_dev`.

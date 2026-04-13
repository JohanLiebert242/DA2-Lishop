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
      shell/          # App shell + header (port 3000)
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

## Commands

### Backend (`cd lishop-backend`)

```bash
pnpm dev                                           # Start API in watch mode
pnpm test                                          # Run all tests
pnpm --filter @lishop/api test -- --no-coverage    # Run all tests (faster, no coverage)
pnpm --filter @lishop/api test -- --testPathPattern=orders.service.spec --no-coverage  # Run a single spec file
pnpm --filter @lishop/api tsc --noEmit             # Type-check the API
pnpm --filter @lishop/database db:generate         # Regenerate Prisma client after schema change
pnpm --filter @lishop/database db:migrate          # Run migrations (dev)
pnpm --filter @lishop/database db:seed             # Seed the database
docker-compose up -d                               # Start Postgres (port 5439) + Redis
```

### Frontend (`cd lishop-frontend`)

```bash
pnpm dev                                           # Start all MFEs concurrently
pnpm --filter @lishop/shell dev                    # Start only the shell
pnpm --filter @lishop/mfe-admin dev                # Start only one MFE
pnpm --filter @lishop/mfe-admin type-check         # Type-check one MFE
pnpm type-check                                    # Type-check all MFEs
```

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
- **JWT**: `jose` v4 — `jwtVerify` / `new SignJWT(...)`. Access token in `Authorization: Bearer` header; refresh token in httpOnly cookie `lishop_rt`
- **Auth token in localStorage**: `lishop_at` — all frontend MFEs read this key
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
- `src/lib/<domain>-api.ts` — typed `apiFetch` wrapper that reads `lishop_at` from localStorage

### Data Fetching Pattern

All MFEs use TanStack Query v5:

```typescript
// Reading lishop_at (all api files follow this pattern)
function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('lishop_at');
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
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

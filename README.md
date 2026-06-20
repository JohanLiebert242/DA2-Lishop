# Lishop — Mua sắm thông minh

**Lishop** is a production-grade e-commerce platform built with a micro-frontend frontend and a modular NestJS backend. It supports Vietnamese and English, integrates with multiple payment gateways and shipping carriers, and includes AI-powered features for shopping, analytics, and operations.

> **Tech stack:** Next.js 15 (Module Federation) + NestJS + PostgreSQL + Prisma + Redis + Meilisearch

---

## Architecture

The project lives in two independent Turborepo + pnpm monorepos:

```
DA2/
├── lishop-backend/        # NestJS REST API (port 4000)
│   ├── apps/api/          # Main NestJS application
│   └── packages/
│       ├── database/      # Prisma schema, migrations, client
│       ├── contracts/     # Shared enums & interfaces
│       └── config/        # ESLint & TypeScript config
│
├── lishop-frontend/       # Next.js Micro Frontends
│   ├── apps/
│   │   ├── shell/         # App shell, header, auth state (3010)
│   │   ├── mfe-auth/      # Login, register, OAuth (3001)
│   │   ├── mfe-catalog/   # Product browsing & search (3002)
│   │   ├── mfe-cart/      # Shopping cart (3003)
│   │   ├── mfe-checkout/  # Checkout flow (3004)
│   │   ├── mfe-orders/    # Order history & detail (3005)
│   │   ├── mfe-profile/   # User profile & loyalty (3006)
│   │   ├── mfe-promotions/# Flash sales & coupons (3007)
│   │   ├── mfe-notifications/ # Notifications (3008)
│   │   └── mfe-admin/     # Admin dashboard (3009)
│   └── packages/
│       ├── shared/        # formatVND, cn, utilities
│       ├── contracts/     # TypeScript types
│       ├── event-bus/     # Cross-MFE EventEmitter
│       ├── ui/            # Radix UI + Tailwind design system
│       └── config/        # ESLint, TypeScript, Tailwind config
│
├── docs/                  # Feature specifications & plans
├── project-plan/          # Implementation prompt
├── CLAUDE.md              # AI-assisted development guidance
└── README.md              # You are here
```

### Frontend Architecture (Micro Frontends)

10 Next.js apps communicate through:

- **Shared auth** — Zustand store in the shell (`useAuthStore`)
- **Cross-MFE navigation** — plain `<a href>` or `window.location`
- **Event bus** — `@lishop/event-bus` for events (`AUTH_LOGIN`, `CART_UPDATED`, etc.)
- **Server state** — TanStack Query v5 with `credentials: 'include'`

### Backend Architecture (Modules)

23 domain modules, each following a strict three-layer pattern:

```
modules/<domain>/
├── dto/                          # Validation DTOs
├── <domain>.repository.ts        # Prisma queries only
├── <domain>.service.ts           # Business logic
├── <domain>.service.spec.ts      # Unit tests
├── <domain>.controller.ts        # HTTP endpoints
└── <domain>.module.ts            # NestJS wiring
```

**Key infrastructure:** JWT auth (httpOnly cookies), Redis caching, BullMQ job queues, WebSocket notifications, OpenAI integration, Swagger API docs.

---

## Features

### Customer-facing

| Feature | Status |
|---|---|
| Product catalog with search & filters | ✅ |
| Multi-provider cart (Redis-backed) | ✅ |
| Checkout with address management | ✅ |
| Order lifecycle tracking | ✅ |
| 7 payment methods (Stripe, PayPal, VNPay, MoMo, ZaloPay, Wallet, COD) | ✅ |
| 3 shipping carriers (GHN, GHTK, Viettel Post) | ✅ |
| User profiles & loyalty points | ✅ |
| Product reviews with moderation | ✅ |
| Support tickets & FAQ | ✅ |
| Flash sales & coupons | ✅ |
| Returns & refunds | ✅ |
| Digital wallet & top-ups | ✅ |
| Tax invoices | ✅ |
| Notifications (in-app + email) | ✅ |

### AI Superpowers

| Feature | Description |
|---|---|
| AI Product Discovery | Natural-language product search |
| AI Shopping Concierge | Conversational shopping assistant |
| AI Style Fit Advisor | Virtual styling recommendations |
| AI Personalized Recommendations | "Dành cho bạn" suggestions |
| AI Analytics Insights | Admin sales/revenue analysis |
| AI Product Copywriting | Auto-generate product descriptions |
| AI Review Moderation | Automated review approval/rejection |
| AI Support Ticket Assistant | Ticket summarization & replies |

### Admin Dashboard

| Feature | Description |
|---|---|
| Dashboard | KPIs, revenue chart, order status breakdown, low-stock alerts |
| Analytics | Revenue trends, top products, AI insights |
| Order management | Status updates, shipping handoff, tracking |
| Product management | CRUD, CSV/JSON import, AI import enrichment |
| Inventory | Stock levels, adjustment history, low-stock warnings |
| Promotions | Coupon CRUD, flash sale management |
| Support | Ticket management with AI assist |
| Returns & refunds | Request processing with AI assist |
| Payments & invoices | COD confirmation, invoice regeneration |
| User management | Role management, wallets, top-up approval |
| Review moderation | AI-powered approval/rejection |

---

## Getting Started

### Prerequisites

- Node.js **>=20**
- pnpm **>=9**
- Docker Desktop

### 1. Clone & install

```bash
git clone <repo-url> DA2
cd DA2

cd lishop-backend
pnpm install

cd ../lishop-frontend
pnpm install
```

### 2. Environment files

```bash
# Backend
cd lishop-backend
cp .env.example .env
# Edit .env if needed (defaults work with Docker Compose)

# Frontend
cd ../lishop-frontend
cp .env.example .env
```

### 3. Start infrastructure

```bash
cd lishop-backend
docker-compose up -d
```

Starts PostgreSQL (5439), Redis (6380), Meilisearch (7700).

### 4. Set up the database (first run only)

```bash
cd lishop-backend
pnpm --filter @lishop/database db:generate
pnpm --filter @lishop/database db:migrate
pnpm --filter @lishop/database db:seed
```

### 5. Start development servers

```bash
# Terminal 1 — Backend
cd lishop-backend
pnpm dev          # http://localhost:4000

# Terminal 2 — Frontend
cd lishop-frontend
pnpm dev          # http://localhost:3010
```

---

## Development Scripts

### Backend (`lishop-backend/`)

| Command | Description |
|---|---|
| `pnpm dev` | Start API in watch mode |
| `pnpm test` | Run all unit tests |
| `pnpm --filter @lishop/api test -- --no-coverage` | Fast test run |
| `pnpm --filter @lishop/database db:studio` | Open Prisma Studio |
| `pnpm --filter @lishop/database db:migrate` | Apply migrations |
| `pnpm --filter @lishop/database db:seed` | Seed demo data |

### Frontend (`lishop-frontend/`)

| Command | Description |
|---|---|
| `pnpm dev` | Start all MFEs concurrently |
| `pnpm type-check` | TypeScript check all packages |
| `pnpm build` | Production build |
| `pnpm e2e:checkout` | Playwright checkout e2e test |
| `pnpm --filter @lishop/mfe-admin dev` | Start single MFE |

---

## Technology Stack

### Backend

| Category | Choice |
|---|---|
| Runtime | Node.js, TypeScript |
| Framework | NestJS (Fastify adapter) |
| Database | PostgreSQL 16 via Prisma 5 |
| Cache | Redis 7 (ioredis) |
| Search | Meilisearch |
| Auth | JWT (jose), httpOnly cookies, OAuth |
| Payments | Stripe, PayPal, VNPay, MoMo, ZaloPay |
| Queues | BullMQ |
| Real-time | Socket.io |
| AI | OpenAI Responses API (gpt-5.2) |

### Frontend

| Category | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Micro Frontends | Module Federation v8 |
| Styling | Tailwind CSS 4 + Radix UI + shadcn/ui |
| State | TanStack Query v5 + Zustand v4 |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| i18n | next-intl (vi + en) |
| Testing | Vitest + Playwright |

### Deployment

| Service | Platform |
|---|---|
| Container | Docker |
| File storage | AWS S3 |
| Reverse proxy | Nginx (local MFE routing) |

---

## Project Structure Details

### Shared Packages

| Package | Location | Description |
|---|---|---|
| `@lishop/database` | `lishop-backend/packages/database` | Prisma singleton |
| `@lishop/contracts` | Both monorepos | Shared types & enums |
| `@lishop/ui` | `lishop-frontend/packages/ui` | 30+ Radix-based components |
| `@lishop/shared` | `lishop-frontend/packages/shared` | Utilities |
| `@lishop/event-bus` | `lishop-frontend/packages/event-bus` | BroadcastChannel events |
| `@lishop/config` | Both monorepos | ESLint, TS, Tailwind config |

### Key Backend Patterns

- **Response envelope:** `{ data: T, statusCode, timestamp }` via `TransformInterceptor`
- **Repository pattern:** Prisma access isolated in repositories
- **Validation:** Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`
- **Rate limiting:** 100 requests/min globally
- **Fire-and-forget notifications:** Wrapped in `.catch()` to avoid aborting primary operations

### Key Frontend Patterns

- **Auth:** `hasSessionCookie()` checks `lishop_session` cookie (JS-readable companion to httpOnly `lishop_at`)
- **API fetch:** `apiFetch` wrapper with auto-refresh on 401 via `/auth/refresh`
- **Cache invalidation:** `queryClient.invalidateQueries(...)` on mutation `onSuccess`
- **Cross-MFE navigation:** Always use absolute URLs with port numbers

---

## Code Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`)
- **Backend tests:** TDD — write spec first, confirm fail, implement, confirm pass
- **Ownership checks:** Prefer `updateMany({ where: { id, userId } })` over `findFirst` + `update`
- **No `new PrismaClient()`** — always import `prisma` from `@lishop/database`

---

## License

MIT

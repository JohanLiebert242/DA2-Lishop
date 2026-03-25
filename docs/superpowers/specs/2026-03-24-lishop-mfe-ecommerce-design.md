# Lishop Micro Frontend E-Commerce Platform — Design Spec

**Date:** 2026-03-24
**Status:** Approved

---

## 1. Project Overview

Lishop is a production-grade, bilingual (Vietnamese + English) micro frontend e-commerce platform built following Clean Code, DRY, and SOLID principles throughout every layer.

**Key decisions:**
- Full production platform — all 18 implementation steps from the original spec
- Real third-party integrations (Stripe, PayPal, VNPay, MoMo, GHN, GHTK, Google OAuth, Facebook OAuth, FCM, Twilio)
- Deployment target: Vercel (frontends) + managed cloud (NestJS backend); Docker Compose for local dev
- Two separate Git repositories (frontend + backend), each a Turborepo + pnpm workspace
- Contracts package duplicated in both repos and kept in sync manually
- Bilingual: Vietnamese (`vi`) + English (`en`), VND + USD
- Tests written alongside features; coverage targets enforced before final deployment

---

## 2. Repository Structure

### `lishop-frontend`

```
lishop-frontend/
├── apps/
│   ├── shell/              # MFE host (port 3000)
│   ├── mfe-auth/           # port 3001
│   ├── mfe-catalog/        # port 3002
│   ├── mfe-cart/           # port 3003
│   ├── mfe-checkout/       # port 3004
│   ├── mfe-orders/         # port 3005
│   ├── mfe-profile/        # port 3006
│   ├── mfe-promotions/     # port 3007
│   ├── mfe-notifications/  # port 3008
│   └── mfe-admin/          # port 3009
├── packages/
│   ├── contracts/          # @lishop/contracts — TS types + Zod schemas (FE copy)
│   ├── ui/                 # @lishop/ui — shadcn/ui design system
│   ├── shared/             # @lishop/shared — hooks, formatters, helpers
│   ├── event-bus/          # @lishop/event-bus — cross-MFE EventEmitter
│   └── config/             # Shared ESLint, TS, Tailwind configs
├── docker-compose.yml      # Nginx reverse proxy for local MFE routing
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

### `lishop-backend`

```
lishop-backend/
├── apps/
│   └── api/                # NestJS app (port 4000)
│       └── src/
│           ├── modules/    # auth, users, products, cart, orders, payments...
│           ├── common/     # filters, guards, interceptors, pipes, decorators
│           ├── config/
│           └── main.ts
├── packages/
│   ├── contracts/          # @lishop/contracts — TS types + Zod schemas (BE copy)
│   └── database/           # @lishop/database — Prisma schema + migrations + seed
├── docker-compose.yml      # Postgres, Redis, MeiliSearch
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

**Contract sync rule:** When a schema changes, it must be updated in both repos before deploying. Breaking changes require coordinated PRs in both repos. Enforcement: a GitHub Actions CI step in each repo runs `pnpm tsc --noEmit` against the contracts package; a type mismatch between repos will surface as a CI failure on the consuming side before merge.

---

## 3. Frontend Architecture

### Tech Stack

| Concern | Tool |
|---|---|
| Framework | Next.js 15 (App Router, strict TS, Webpack 5 — Turbopack disabled) |
| MFE | `@module-federation/nextjs-mf` |
| State | Zustand (global) + TanStack Query v5 (server state) |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v4 + shadcn/ui + Radix UI primitives |
| Animation | Framer Motion |
| Icons | Lucide React |
| i18n | next-intl (vi + en) |
| SEO | Next.js `generateMetadata()` + next-sitemap |
| Images | `next/image` + Cloudinary |
| Analytics | Vercel Analytics + PostHog |

### Module Federation Setup

`shell` is the host; all other MFE apps are remotes.

Remote URLs are driven by environment variables so they work across local dev, CI, and Vercel preview/production:

```ts
// shell/next.config.ts
new NextFederationPlugin({
  name: 'shell',
  remotes: {
    mfeAuth:     `mfeAuth@${process.env.NEXT_PUBLIC_MFE_AUTH_URL}/_next/static/chunks/remoteEntry.js`,
    mfeCatalog:  `mfeCatalog@${process.env.NEXT_PUBLIC_MFE_CATALOG_URL}/_next/static/chunks/remoteEntry.js`,
    mfeCart:     `mfeCart@${process.env.NEXT_PUBLIC_MFE_CART_URL}/_next/static/chunks/remoteEntry.js`,
    // ... one entry per MFE
  },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
})
```

`.env.example` defines all MFE URLs:
```env
NEXT_PUBLIC_MFE_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_MFE_CATALOG_URL=http://localhost:3002
NEXT_PUBLIC_MFE_CART_URL=http://localhost:3003
# ... etc.
```

In Vercel, each MFE is deployed as its own project; its production URL is injected as an env var into the shell project.

Each MFE exposes its pages:

```ts
// mfe-auth/next.config.ts
new NextFederationPlugin({
  name: 'mfeAuth',
  filename: 'static/chunks/remoteEntry.js',
  exposes: {
    './LoginPage':    './src/app/login/page.tsx',
    './RegisterPage': './src/app/register/page.tsx',
  },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
})
```

Shell loads MFE pages via dynamic import with Suspense:

```ts
const LoginPage = dynamic(() => import('mfeAuth/LoginPage'), { ssr: false })
```

### Shared State & Communication

| Concern | Mechanism |
|---|---|
| Auth state | Zustand store in shell, exposed via Module Federation `shared` config |
| Cross-MFE events | `@lishop/event-bus` typed EventEmitter (`AUTH_LOGIN`, `CART_UPDATED`, etc.) |
| Server state | TanStack Query v5 per-MFE with `staleWhileRevalidate` |
| Auth token | `httpOnly` cookie; each MFE reads via `GET /api/auth/me` |

### Local Dev

Turborepo runs all 10 MFEs + shell in parallel with `pnpm dev`. Nginx in `docker-compose.yml` proxies all traffic through `localhost:3000`.

---

## 4. Backend Architecture

### Tech Stack

| Concern | Tool |
|---|---|
| Framework | NestJS 10 (Fastify adapter, strict TS) |
| API | REST only (GraphQL is out of scope for this build) |
| Auth | Custom guards + JWT (jose) + OAuth2 (Google, Facebook) |
| ORM | Prisma 5 + PostgreSQL 16 |
| Cache | Redis 7 (ioredis) |
| Queue | BullMQ |
| Search | MeiliSearch |
| Storage | AWS S3 / Cloudflare R2 |
| Email | Nodemailer + React Email |
| SMS | Twilio (optional) |
| Push | Firebase Cloud Messaging |
| Payments | Stripe, PayPal, VNPay, MoMo, COD |
| Shipping | GHN, GHTK, Standard |
| PDF | Puppeteer / @react-pdf/renderer |
| Docs | Swagger (OpenAPI 3.1) |

### Module Internal Pattern

Every domain module follows this structure:

```
modules/<domain>/
├── <domain>.module.ts
├── <domain>.controller.ts      # Routes only — no business logic
├── <domain>.service.ts         # All business logic
├── <domain>.repository.ts      # All Prisma calls
├── dto/                        # class-validator DTOs
├── guards/
└── interfaces/
    └── <domain>-service.interface.ts
```

### Domain Modules

| Module | Key Responsibilities |
|---|---|
| `auth` | JWT, OAuth2, email verify, password reset, token blacklist |
| `users` | Profile, addresses, loyalty points, role management |
| `products` | CRUD, slug lookup, MeiliSearch sync, S3 upload, stock management |
| `categories` | Tree structure, Redis-cached (TTL 1h) |
| `cart` | Redis-backed, guest merge, promotion application |
| `orders` | CheckoutSession (Redis), state machine, stock reservation |
| `payments` | Strategy pattern — Stripe, PayPal, VNPay, MoMo, COD |
| `shipping` | Strategy pattern — GHN, GHTK, Standard |
| `reviews` | Verified-purchase guard, moderation, aggregate rating via BullMQ |
| `promotions` | Coupons, flash sales (Redis TTL), loyalty points |
| `notifications` | BullMQ jobs — email, push (FCM), in-app feed |
| `admin` | Aggregates modules, WebSocket real-time order feed |

### Key Patterns

- **Repository pattern:** controllers → services → repositories → Prisma. No `prisma.x` in service files.
- **Strategy pattern:** `PaymentService` and `ShippingService` accept `IPaymentProvider` / `IShippingProvider` via DI.
- **BullMQ for all async work:** emails, push, invoice PDF, rating recalculation — nothing slow in request path.
- **GlobalExceptionFilter:** single filter catches and formats all errors.
- **Swagger:** every endpoint documented before it ships.

---

## 5. Data Layer

### PostgreSQL — Core Entities

```
User ──< Address
User ──< Order ──< OrderItem >── Product
User ──< Review >── Product
User ──< CartItem >── Product
User ──< LoyaltyPoint
User ──< NotificationPreference
User ──< DeviceToken

Product >── Category
Product ──< ProductImage
Product ──< ProductTag >── Tag
Product ──< Review

Order >── Payment
Order >── Shipment
Order ──< OrderItem
Order >── Coupon (optional)

Coupon ──< CouponUsage >── User
FlashSale ──< FlashSaleItem >── Product
```

**Schema decisions:**
- `Product.slug` — unique, indexed; used for all lookups
- `Order` status: `PENDING | PROCESSING | SHIPPED | DELIVERED | CANCELLED | REFUNDED`
- `Review` status: `PENDING | APPROVED | REJECTED`
- `User.role`: `CUSTOMER | ADMIN` (`SELLER` role is out of scope for this build)
- All money values as integers (smallest currency unit) — no floats
- Cursor-based pagination on all list queries
- Indexes: `slug`, `categoryId`, `status`, `createdAt`, `userId`

### Redis Key Patterns

| Key | TTL | Purpose |
|---|---|---|
| `cart:guest:{sessionId}` | 30d | Guest cart |
| `cart:user:{userId}` | 90d | User cart |
| `checkout:session:{id}` | 2h | Multi-step checkout state |
| `blacklist:token:{jti}` | 7d | Revoked refresh tokens |
| `rate:forgot-pwd:{ip}` | 1h | Rate limiting |
| `cache:products:{hash}` | 5min | Product listing cache |
| `cache:product:{slug}` | 10min | Product detail cache |
| `cache:categories` | 1h | Category tree cache |
| `flash-sale:{id}` | dynamic | Expires when sale ends |

### MeiliSearch

- Indexes: `products`, `categories`
- Synced via BullMQ job on product create/update/delete
- Frontend uses instant-search with 300ms debounce

### Docker Compose (local dev — `lishop-backend`)

```yaml
services:
  postgres:    image: postgres:16
  redis:       image: redis:7-alpine
  meilisearch: image: getmeili/meilisearch:latest
```

---

## 6. Feature Modules

### Auth (`mfe-auth` + `api/modules/auth`)
- Pages: `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`
- `useAuth()` hook — single auth interface across all MFEs
- OAuth: Google + Facebook via custom guards (no Passport)
- `AUTH_LOGIN` event emitted on login; all MFEs react
- Tokens: `accessToken` in memory (15min), `refreshToken` in `httpOnly` cookie (7d)
- Password reset: Redis token (TTL 1h); forgot-password rate-limited (5 req/hour/IP)
- Email verification via BullMQ + Nodemailer + React Email

### Products (`mfe-catalog` + `api/modules/products`)
- `/products` — grid/list toggle, infinite scroll, filter sidebar, sort
- `/products/[slug]` — image gallery (Swiper), tabs, related products
- MeiliSearch instant-search (300ms debounce)
- Multipart upload → S3/R2 → store URLs
- Stock updates via Prisma transactions

### Cart (`mfe-cart` + `api/modules/cart`)
- Zustand state; Redis (logged-in) or `localStorage` (guest)
- Guest merge on login via `POST /cart/merge`
- Cart drawer from `@lishop/ui`
- `CART_UPDATED` event → header badge update
- Promotions/coupons applied server-side in cart computation layer

### Checkout + Orders (`mfe-checkout` + `mfe-orders` + `api/modules/orders`)
- Wizard: Address → Shipping → Payment → Confirmation
- Zustand state, resumable on refresh; Redis `CheckoutSession` (TTL 2h)
- Order creation: validate cart → reserve stock → create order → queue payment
- Status machine: `PENDING → PROCESSING → SHIPPED → DELIVERED | CANCELLED`
- `/orders/[id]` — timeline stepper, tracking info, cancel/refund CTA

### Payments (`api/modules/payments`)
- `IPaymentProvider` strategy: Stripe, PayPal, VNPay, MoMo, COD
- Webhooks verify signatures before processing
- Invoice PDF via BullMQ → S3 → URL on order

### Shipping (`api/modules/shipping`)
- `IShippingProvider` strategy: GHN, GHTK, Standard
- `GET /shipping/options` returns providers with fees + ETAs
- Multiple addresses per user with one default

### Reviews (`api/modules/reviews`)
- Guard: must have `DELIVERED` order with `productId` → `verifiedPurchase: true`
- Moderation: `PENDING → APPROVED | REJECTED`
- Aggregate rating recalculated via BullMQ
- 1 review per product per user

### Promotions (`mfe-promotions` + `api/modules/promotions`)
- `Coupon`: code, type (`PERCENT | FIXED | FREE_SHIPPING`), value, minOrderValue, maxUses, expiresAt
- `FlashSale`: discountPercent, startAt/endAt, Redis TTL for expiry
- `LoyaltyPoint`: earn on purchase, redeem at checkout
- `POST /promotions/apply` validates and returns discount breakdown
- `mfe-promotions` UI exposes: a coupon entry/validation widget (embedded in checkout via Module Federation), a flash sale banner component (consumed by `mfe-catalog`), and a `/promotions` page listing all active deals and the user's available loyalty points

### Notifications (`mfe-notifications` + `api/modules/notifications`)
- All via BullMQ — never synchronous
- Channels: email (React Email + Nodemailer), push (FCM), in-app
- `GET /notifications` — paginated, mark-as-read
- Per-channel per-event opt-out preferences

### Admin (`mfe-admin`)
- Lazy-loaded, `Role.ADMIN` only
- Products CRUD, orders management, user management, promotions, analytics
- Recharts for revenue, top products, order funnel, inventory alerts
- Real-time order feed via WebSocket (Socket.io)

---

## 7. Security

- `accessToken` in memory, `refreshToken` in `httpOnly` cookie
- RBAC via `@Roles()` decorator + `RolesGuard`; role in JWT + verified against DB
- All DTOs validated with `class-validator` + `class-sanitizer`
- `@nestjs/throttler`: global 100 req/min + tighter auth limits
- CORS: whitelist MFE origins only
- `@nestjs/helmet`: all security headers
- Prisma parameterised queries — no SQL injection surface
- Secrets via `process.env` only, validated at startup with Joi
- Payment webhooks verify provider signatures

---

## 8. SEO & Performance

### Frontend
- `generateMetadata()` for dynamic OG/Twitter tags on product/category pages
- `next-sitemap` generates `/sitemap.xml` at build time
- `next/image` with `priority` above fold, lazy elsewhere
- Core Web Vitals budget: LCP < 2.5s, CLS < 0.1, INP < 200ms
- Vercel Analytics + PostHog for real user monitoring

### Backend
- Redis cache-aside: product listing (5min), product detail (10min), categories (1h)
- Cache invalidated on write
- Cursor pagination on all list endpoints
- Indexes on all filter/sort columns

---

## 9. Testing Strategy

| Layer | Tool | Coverage Target | Enforced |
|---|---|---|---|
| Unit | Vitest / Jest | >= 80% | Before final deploy |
| Integration | Supertest + Testcontainers | >= 70% | Before final deploy |
| Component | React Testing Library | >= 70% | Before final deploy |
| E2E | Playwright | All happy paths | Per feature |

**E2E critical paths:**
1. Register → verify email → login
2. Browse products → add to cart → checkout → payment → order confirmation
3. Apply coupon → verify discount → place order
4. Admin: create product → appears on catalog MFE

---

## 10. CI/CD

- **`lishop-frontend`:** GitHub Actions — lint + test + build; deploy changed MFEs to Vercel (Turborepo `affected`)
- **`lishop-backend`:** GitHub Actions — lint + test + build; deploy via Docker container to Railway (primary choice for managed cloud). The `api` app is containerised with a `Dockerfile`; Railway pulls from the GitHub repo on merge to `main`. Environment variables (DB URL, Redis URL, JWT secrets, payment keys) are injected via Railway's environment config. No Kubernetes required at this stage.

---

## 11. Implementation Order

Follow the PDF spec's 18-step sequence with confirmation checkpoint after each step:

1. Monorepo scaffold (both repos) — Turborepo + pnpm workspaces + shared configs
2. `packages/contracts` — all shared Zod schemas and TypeScript types (both repos)
3. `packages/ui` — design system (Button, Input, Card, Badge, Dialog, Toast)
4. `api` core — NestJS bootstrap, Prisma schema, global guards/filters/interceptors
5. `api/modules/auth` — full auth including OAuth + email queue
6. `shell` — Module Federation host, global layout, auth guard, event bus
7. `mfe-auth` — all auth pages
8. `api/modules/products` + `mfe-catalog` — product listing and detail
9. `api/modules/cart` + `mfe-cart` — cart with guest support
10. `api/modules/orders` + `mfe-checkout` + `mfe-orders` — full order flow
11. `api/modules/payments` (part 1) — Stripe + COD providers, webhook infrastructure, invoice PDF
11b. `api/modules/payments` (part 2) — PayPal, VNPay, MoMo providers
12. `api/modules/shipping` — shipping providers (GHN, GHTK, Standard)
13. `api/modules/reviews` + `api/modules/promotions` — reviews, coupons, flash sales
14. `api/modules/notifications` + `mfe-notifications` — notification system
15. `mfe-admin` — admin dashboard
16. `mfe-profile` + `mfe-promotions` — user profile and promotions UI
17. SEO, performance tuning, E2E tests
18. Infrastructure — Docker, CI/CD pipelines

**After each step:** summarise files created, show preview checklist (URL, curl snippet, test command), and wait for user confirmation before proceeding.

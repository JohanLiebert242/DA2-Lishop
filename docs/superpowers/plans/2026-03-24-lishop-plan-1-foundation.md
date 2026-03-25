# Lishop Plan 1: Foundation — Monorepo Scaffold, Contracts, UI & API Core

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap both `lishop-frontend` and `lishop-backend` monorepos with Turborepo + pnpm workspaces, scaffold all shared packages (contracts, UI, event-bus, shared), initialize all 10 MFE apps with Module Federation config, and stand up the NestJS API with Prisma schema and global infrastructure.

**Architecture:** Two separate Turborepo + pnpm monorepos. The frontend monorepo has 10 Next.js 15 MFE apps (Webpack 5, no Turbopack) plus shared packages. The backend monorepo has a NestJS 10 (Fastify adapter) API app plus `packages/database` (Prisma) and `packages/contracts`. Contracts are duplicated across both repos; CI enforces type safety with `tsc --noEmit`.

**Tech Stack:** Node 20, pnpm 9, Turborepo 2, Next.js 15, NestJS 10 (Fastify), Prisma 5, PostgreSQL 16, Redis 7, `@module-federation/nextjs-mf`, Tailwind CSS v4, shadcn/ui, Zod 3, TypeScript 5.5 strict, Vitest, React Testing Library, Jest, Supertest

---

## File Map

### lishop-frontend/
```
package.json                          root workspace
pnpm-workspace.yaml
turbo.json
.env.example
docker-compose.yml                    nginx reverse proxy
nginx.conf                            nginx proxy config
.github/workflows/ci.yml

packages/config/
  package.json                        @lishop/config
  eslint.js                           shared ESLint config
  tailwind.ts                         shared Tailwind preset
  tsconfig.base.json                  shared TS base

packages/contracts/
  package.json                        @lishop/contracts
  tsconfig.json
  src/index.ts                        barrel export
  src/auth.ts                         auth Zod schemas + types
  src/user.ts
  src/product.ts
  src/category.ts
  src/cart.ts
  src/order.ts
  src/payment.ts
  src/shipping.ts
  src/review.ts
  src/promotion.ts
  src/notification.ts
  src/common.ts                       shared pagination, ApiResponse, enums

packages/event-bus/
  package.json                        @lishop/event-bus
  tsconfig.json
  src/index.ts
  src/events.ts                       event name constants + payload types
  src/event-bus.ts                    typed EventEmitter class
  src/__tests__/event-bus.test.ts

packages/shared/
  package.json                        @lishop/shared
  tsconfig.json
  src/index.ts
  src/hooks/use-debounce.ts
  src/formatters/currency.ts          formatVND / formatUSD
  src/formatters/date.ts
  src/utils/cn.ts                     clsx + tailwind-merge

packages/ui/
  package.json                        @lishop/ui
  tsconfig.json
  components.json                     shadcn config
  src/index.ts
  src/lib/utils.ts
  src/components/button.tsx
  src/components/input.tsx
  src/components/card.tsx
  src/components/badge.tsx
  src/components/dialog.tsx
  src/components/toast.tsx
  src/components/sonner.tsx
  src/__tests__/button.test.tsx

apps/shell/
  package.json
  next.config.ts                      Module Federation host
  tsconfig.json
  tailwind.config.ts
  src/app/layout.tsx
  src/app/page.tsx
  src/app/globals.css
  src/providers/index.tsx             QueryClientProvider + ThemeProvider

apps/mfe-auth/
apps/mfe-catalog/
apps/mfe-cart/
apps/mfe-checkout/
apps/mfe-orders/
apps/mfe-profile/
apps/mfe-promotions/
apps/mfe-notifications/
apps/mfe-admin/
  (each): package.json, next.config.ts, tsconfig.json, src/app/layout.tsx, src/app/page.tsx
```

### lishop-backend/
```
package.json
pnpm-workspace.yaml
turbo.json
.env.example
docker-compose.yml                    postgres:16, redis:7, meilisearch
Dockerfile                            (created in Plan 7 — CI/CD step)
.github/workflows/ci.yml

packages/config/
  package.json                        @lishop/config
  tsconfig.base.json
  eslint.js

packages/contracts/                   COPY of frontend contracts
  (same structure as frontend contracts)

packages/database/
  package.json                        @lishop/database
  tsconfig.json
  prisma/schema.prisma                full schema (all models)
  prisma/seed.ts
  src/index.ts                        re-exports PrismaClient

apps/api/
  package.json
  tsconfig.json
  nest-cli.json
  src/main.ts                         Fastify bootstrap
  src/app.module.ts
  src/health/health.controller.ts     GET /health → 200
  src/config/config.module.ts         @nestjs/config + Joi validation
  src/common/filters/global-exception.filter.ts
  src/common/interceptors/logging.interceptor.ts
  src/common/interceptors/transform.interceptor.ts
  src/common/pipes/validation.pipe.ts
  src/common/decorators/roles.decorator.ts
  src/common/decorators/current-user.decorator.ts
  test/app.e2e-spec.ts                GET /health → { status: 'ok' }
```

---

## Task 1: Initialize lishop-frontend monorepo

**Files:**
- Create: `lishop-frontend/package.json`
- Create: `lishop-frontend/pnpm-workspace.yaml`
- Create: `lishop-frontend/turbo.json`
- Create: `lishop-frontend/.env.example`

- [ ] **Step 1: Create root directory and package.json**

```bash
mkdir lishop-frontend && cd lishop-frontend
```

`package.json`:
```json
{
  "name": "lishop-frontend",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  },
  "engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["NODE_ENV", "NEXT_PUBLIC_*"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "lint": { "outputs": [] },
    "test": { "outputs": ["coverage/**"], "cache": false },
    "type-check": { "dependsOn": ["^build"], "outputs": [] },
    "clean": { "cache": false }
  }
}
```

- [ ] **Step 4: Create .env.example**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
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

- [ ] **Step 5: Install root deps**

```bash
pnpm install
```
Expected: `node_modules/.pnpm` created, no errors.

- [ ] **Step 6: Commit**

```bash
git init && git add -A && git commit -m "chore: init lishop-frontend monorepo"
```

---

## Task 2: Initialize lishop-backend monorepo

**Files:**
- Create: `lishop-backend/package.json`
- Create: `lishop-backend/pnpm-workspace.yaml`
- Create: `lishop-backend/turbo.json`
- Create: `lishop-backend/docker-compose.yml`
- Create: `lishop-backend/.env.example`

- [ ] **Step 1: Create root files**

```bash
mkdir lishop-backend && cd lishop-backend
```

`package.json`:
```json
{
  "name": "lishop-backend",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "type-check": "turbo run type-check",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:seed": "turbo run db:seed"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  },
  "engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" },
  "packageManager": "pnpm@9.0.0"
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "persistent": true, "cache": false },
    "lint": { "outputs": [] },
    "test": { "outputs": ["coverage/**"], "cache": false },
    "type-check": { "dependsOn": ["^build"], "outputs": [] },
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false },
    "db:seed": { "cache": false }
  }
}
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: lishop
      POSTGRES_PASSWORD: lishop
      POSTGRES_DB: lishop
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  meilisearch:
    image: getmeili/meilisearch:latest
    ports:
      - '7700:7700'
    environment:
      MEILI_MASTER_KEY: masterKey
    volumes:
      - meilisearch_data:/meili_data

volumes:
  postgres_data:
  redis_data:
  meilisearch_data:
```

- [ ] **Step 3: Create .env.example**

```env
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://lishop:lishop@localhost:5432/lishop
REDIS_URL=redis://localhost:6379
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_MASTER_KEY=masterKey

JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

GHN_TOKEN=
GHTK_TOKEN=

FCM_SERVICE_ACCOUNT_JSON=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@lishop.vn

AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=lishop-assets
```

- [ ] **Step 4: Start Docker services**

```bash
cp .env.example .env
docker compose up -d
```
Expected: 3 containers running (`lishop-backend-postgres-1`, `lishop-backend-redis-1`, `lishop-backend-meilisearch-1`).

- [ ] **Step 5: Commit**

```bash
git init && git add -A && git commit -m "chore: init lishop-backend monorepo"
```

---

## Task 3: Shared config packages (both repos)

**Files:**
- Create: `lishop-frontend/packages/config/package.json`
- Create: `lishop-frontend/packages/config/tsconfig.base.json`
- Create: `lishop-frontend/packages/config/eslint.js`
- Create: `lishop-frontend/packages/config/tailwind.ts`
- Create: `lishop-backend/packages/config/package.json`
- Create: `lishop-backend/packages/config/tsconfig.base.json`
- Create: `lishop-backend/packages/config/eslint.js`

- [ ] **Step 1: Frontend config package**

`lishop-frontend/packages/config/package.json`:
```json
{
  "name": "@lishop/config",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./eslint": "./eslint.js",
    "./tailwind": "./tailwind.ts",
    "./tsconfig": "./tsconfig.base.json"
  }
}
```

`lishop-frontend/packages/config/tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "dom", "dom.iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "exclude": ["node_modules"]
}
```

`lishop-frontend/packages/config/eslint.js`:
```js
/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

`lishop-frontend/packages/config/tailwind.ts`:
```ts
import type { Config } from 'tailwindcss';

const config: Omit<Config, 'content'> = {
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
};

export default config;
```

- [ ] **Step 2: Backend config package**

`lishop-backend/packages/config/package.json`:
```json
{
  "name": "@lishop/config",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./eslint": "./eslint.js",
    "./tsconfig": "./tsconfig.base.json"
  }
}
```

`lishop-backend/packages/config/tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  },
  "exclude": ["node_modules", "dist"]
}
```

`lishop-backend/packages/config/eslint.js`:
```js
/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['plugin:@typescript-eslint/recommended'],
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

- [ ] **Step 3: Install and commit**

```bash
# in lishop-frontend
pnpm install
git add -A && git commit -m "chore: add @lishop/config package"

# in lishop-backend
pnpm install
git add -A && git commit -m "chore: add @lishop/config package"
```

---

## Task 4: @lishop/contracts (frontend)

**Files:**
- Create: `lishop-frontend/packages/contracts/package.json`
- Create: `lishop-frontend/packages/contracts/tsconfig.json`
- Create: `lishop-frontend/packages/contracts/src/common.ts`
- Create: `lishop-frontend/packages/contracts/src/auth.ts`
- Create: `lishop-frontend/packages/contracts/src/user.ts`
- Create: `lishop-frontend/packages/contracts/src/product.ts`
- Create: `lishop-frontend/packages/contracts/src/category.ts`
- Create: `lishop-frontend/packages/contracts/src/cart.ts`
- Create: `lishop-frontend/packages/contracts/src/order.ts`
- Create: `lishop-frontend/packages/contracts/src/payment.ts`
- Create: `lishop-frontend/packages/contracts/src/shipping.ts`
- Create: `lishop-frontend/packages/contracts/src/review.ts`
- Create: `lishop-frontend/packages/contracts/src/promotion.ts`
- Create: `lishop-frontend/packages/contracts/src/notification.ts`
- Create: `lishop-frontend/packages/contracts/src/index.ts`

- [ ] **Step 1: package.json + tsconfig**

`package.json`:
```json
{
  "name": "@lishop/contracts",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "zod": "^3.23.0" }
}
```

`tsconfig.json`:
```json
{
  "extends": "@lishop/config/tsconfig",
  "compilerOptions": { "noEmit": true }
}
```

- [ ] **Step 2: common.ts — shared types and enums**

```ts
// src/common.ts
import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z
      .object({
        cursor: z.string().optional(),
        total: z.number().optional(),
      })
      .optional(),
  });

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PaymentMethod {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  COD = 'COD',
}

export enum Currency {
  VND = 'VND',
  USD = 'USD',
}

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
```

- [ ] **Step 3: auth.ts**

```ts
// src/auth.ts
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
```

- [ ] **Step 4: user.ts**

```ts
// src/user.ts
import { z } from 'zod';
import { UserRole } from './common';

export const AddressSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  phone: z.string(),
  street: z.string(),
  district: z.string(),
  city: z.string(),
  country: z.string().default('VN'),
  isDefault: z.boolean().default(false),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().url().nullable(),
  role: z.nativeEnum(UserRole),
  loyaltyPoints: z.number().int().default(0),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
});

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export type Address = z.infer<typeof AddressSchema>;
export type User = z.infer<typeof UserSchema>;
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
```

- [ ] **Step 5: product.ts + category.ts**

```ts
// src/category.ts
import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  imageUrl: z.string().url().nullable(),
  parentId: z.string().uuid().nullable(),
  children: z.lazy((): z.ZodTypeAny => z.array(CategorySchema)).optional(),
});

export type Category = z.infer<typeof CategorySchema>;
```

```ts
// src/product.ts
import { z } from 'zod';

export const ProductImageSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  alt: z.string().nullable(),
  isPrimary: z.boolean(),
});

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  priceVnd: z.number().int().nonnegative(),
  priceUsd: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  categoryId: z.string().uuid(),
  images: z.array(ProductImageSchema),
  tags: z.array(z.string()),
  averageRating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  averageRating: true,
  reviewCount: true,
  createdAt: true,
});

export const ProductListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().uuid().optional(),
  minPriceVnd: z.coerce.number().int().optional(),
  maxPriceVnd: z.coerce.number().int().optional(),
  minRating: z.coerce.number().optional(),
  tags: z.array(z.string()).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'rating_desc', 'newest']).optional(),
  q: z.string().optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;
```

- [ ] **Step 6: cart.ts + order.ts**

```ts
// src/cart.ts
import { z } from 'zod';

export const CartItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  productSlug: z.string(),
  imageUrl: z.string().url().nullable(),
  quantity: z.number().int().positive(),
  priceVnd: z.number().int().nonnegative(),
  priceUsd: z.number().int().nonnegative(),
});

export const CartSchema = z.object({
  items: z.array(CartItemSchema),
  subtotalVnd: z.number().int().nonnegative(),
  subtotalUsd: z.number().int().nonnegative(),
  couponCode: z.string().nullable(),
  discountVnd: z.number().int().nonnegative(),
  totalVnd: z.number().int().nonnegative(),
});

export const AddToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export type CartItem = z.infer<typeof CartItemSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type AddToCartDto = z.infer<typeof AddToCartSchema>;
```

```ts
// src/order.ts
import { z } from 'zod';
import { OrderStatus, PaymentMethod } from './common';
import { AddressSchema } from './user';

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPriceVnd: z.number().int().nonnegative(),
  totalPriceVnd: z.number().int().nonnegative(),
});

export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  status: z.nativeEnum(OrderStatus),
  items: z.array(OrderItemSchema),
  shippingAddress: AddressSchema,
  subtotalVnd: z.number().int().nonnegative(),
  shippingFeeVnd: z.number().int().nonnegative(),
  discountVnd: z.number().int().nonnegative(),
  totalVnd: z.number().int().nonnegative(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  trackingNumber: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
```

- [ ] **Step 7: payment.ts + shipping.ts + review.ts + promotion.ts + notification.ts**

```ts
// src/payment.ts
import { z } from 'zod';
import { PaymentMethod } from './common';

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  method: z.nativeEnum(PaymentMethod),
  amountVnd: z.number().int().nonnegative(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
  providerRef: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type Payment = z.infer<typeof PaymentSchema>;
```

```ts
// src/shipping.ts
import { z } from 'zod';

export const ShippingOptionSchema = z.object({
  provider: z.enum(['GHN', 'GHTK', 'STANDARD']),
  name: z.string(),
  feeVnd: z.number().int().nonnegative(),
  estimatedDays: z.number().int().positive(),
});

export type ShippingOption = z.infer<typeof ShippingOptionSchema>;
```

```ts
// src/review.ts
import { z } from 'zod';
import { ReviewStatus } from './common';

export const ReviewSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  userId: z.string().uuid(),
  userFullName: z.string(),
  rating: z.number().int().min(1).max(5),
  content: z.string().max(2000),
  status: z.nativeEnum(ReviewStatus),
  verifiedPurchase: z.boolean(),
  createdAt: z.string().datetime(),
});

export const CreateReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(10).max(2000),
});

export type Review = z.infer<typeof ReviewSchema>;
export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
```

```ts
// src/promotion.ts
import { z } from 'zod';

export const CouponSchema = z.object({
  id: z.string().uuid(),
  code: z.string().toUpperCase(),
  type: z.enum(['PERCENT', 'FIXED', 'FREE_SHIPPING']),
  value: z.number().int().nonnegative(),
  minOrderVnd: z.number().int().nonnegative(),
  maxUses: z.number().int().nullable(),
  usedCount: z.number().int(),
  expiresAt: z.string().datetime().nullable(),
});

export const ApplyCouponSchema = z.object({
  code: z.string().min(1),
});

export const FlashSaleSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  discountPercent: z.number().int().min(1).max(99),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export type Coupon = z.infer<typeof CouponSchema>;
export type FlashSale = z.infer<typeof FlashSaleSchema>;
export type ApplyCouponDto = z.infer<typeof ApplyCouponSchema>;
```

```ts
// src/notification.ts
import { z } from 'zod';

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['ORDER_STATUS', 'PROMOTION', 'REVIEW', 'SYSTEM']),
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  createdAt: z.string().datetime(),
});

export type Notification = z.infer<typeof NotificationSchema>;
```

- [ ] **Step 8: index.ts barrel export**

```ts
// src/index.ts
export * from './common';
export * from './auth';
export * from './user';
export * from './product';
export * from './category';
export * from './cart';
export * from './order';
export * from './payment';
export * from './shipping';
export * from './review';
export * from './promotion';
export * from './notification';
```

- [ ] **Step 9: Verify types compile**

```bash
cd lishop-frontend
pnpm --filter @lishop/contracts exec tsc --noEmit
```
Expected: No errors.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: add @lishop/contracts package with all domain schemas"
```

---

## Task 5: Copy contracts to lishop-backend

**Files:**
- Create: `lishop-backend/packages/contracts/` (exact copy of frontend contracts)

- [ ] **Step 1: Copy the entire contracts package**

Run from inside `lishop-backend/`:

```bash
cp -r ../lishop-frontend/packages/contracts ./packages/contracts
```

This assumes `lishop-frontend` and `lishop-backend` are siblings in the same parent directory. If they are not siblings, adjust the relative path accordingly (e.g. `../../lishop-frontend/packages/contracts`).

- [ ] **Step 2: Update package.json for backend (CommonJS module)**

`lishop-backend/packages/contracts/package.json`:
```json
{
  "name": "@lishop/contracts",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "zod": "^3.23.0" }
}
```

`lishop-backend/packages/contracts/tsconfig.json`:
```json
{
  "extends": "@lishop/config/tsconfig",
  "compilerOptions": { "noEmit": true }
}
```

- [ ] **Step 3: Verify and commit**

```bash
cd lishop-backend
pnpm install
pnpm --filter @lishop/contracts exec tsc --noEmit
git add -A && git commit -m "feat: add @lishop/contracts package (synced from frontend)"
```

---

## Task 6: @lishop/event-bus

**Files:**
- Create: `lishop-frontend/packages/event-bus/package.json`
- Create: `lishop-frontend/packages/event-bus/src/events.ts`
- Create: `lishop-frontend/packages/event-bus/src/event-bus.ts`
- Create: `lishop-frontend/packages/event-bus/src/index.ts`
- Create: `lishop-frontend/packages/event-bus/src/__tests__/event-bus.test.ts`

- [ ] **Step 1: Create package.json, tsconfig.json, and vitest.config.ts**

`package.json`:
```json
{
  "name": "@lishop/event-bus",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0"
  }
}
```

`tsconfig.json`:
```json
{
  "extends": "@lishop/config/tsconfig",
  "compilerOptions": { "noEmit": true }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node' } });
```

```bash
pnpm --filter @lishop/event-bus install
```

- [ ] **Step 2: Write the failing test**

`src/__tests__/event-bus.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { LishopEventBus, LishopEvent } from '../event-bus';

describe('LishopEventBus', () => {
  it('delivers AUTH_LOGIN payload to subscriber', () => {
    const bus = new LishopEventBus();
    const handler = vi.fn();
    bus.on(LishopEvent.AUTH_LOGIN, handler);
    bus.emit(LishopEvent.AUTH_LOGIN, { userId: 'u1', role: 'CUSTOMER' });
    expect(handler).toHaveBeenCalledWith({ userId: 'u1', role: 'CUSTOMER' });
  });

  it('delivers CART_UPDATED payload to subscriber', () => {
    const bus = new LishopEventBus();
    const handler = vi.fn();
    bus.on(LishopEvent.CART_UPDATED, handler);
    bus.emit(LishopEvent.CART_UPDATED, { itemCount: 3 });
    expect(handler).toHaveBeenCalledWith({ itemCount: 3 });
  });

  it('does not call handler after off()', () => {
    const bus = new LishopEventBus();
    const handler = vi.fn();
    bus.on(LishopEvent.AUTH_LOGOUT, handler);
    bus.off(LishopEvent.AUTH_LOGOUT, handler);
    bus.emit(LishopEvent.AUTH_LOGOUT, undefined);
    expect(handler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd lishop-frontend
pnpm --filter @lishop/event-bus test
```
Expected: FAIL — `Cannot find module '../event-bus'`

- [ ] **Step 4: Implement events.ts**

```ts
// src/events.ts
export enum LishopEvent {
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  CART_UPDATED = 'CART_UPDATED',
  CART_CLEARED = 'CART_CLEARED',
  ORDER_PLACED = 'ORDER_PLACED',
  NOTIFICATION_RECEIVED = 'NOTIFICATION_RECEIVED',
}

export interface LishopEventPayloads {
  [LishopEvent.AUTH_LOGIN]: { userId: string; role: string };
  [LishopEvent.AUTH_LOGOUT]: undefined;
  [LishopEvent.CART_UPDATED]: { itemCount: number };
  [LishopEvent.CART_CLEARED]: undefined;
  [LishopEvent.ORDER_PLACED]: { orderId: string; orderNumber: string };
  [LishopEvent.NOTIFICATION_RECEIVED]: { notificationId: string };
}
```

- [ ] **Step 5: Implement event-bus.ts**

```ts
// src/event-bus.ts
import { LishopEvent, LishopEventPayloads } from './events';

type Handler<E extends LishopEvent> = (payload: LishopEventPayloads[E]) => void;

export class LishopEventBus {
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  on<E extends LishopEvent>(event: E, handler: Handler<E>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as (...args: unknown[]) => void);
  }

  off<E extends LishopEvent>(event: E, handler: Handler<E>): void {
    this.listeners.get(event)?.delete(handler as (...args: unknown[]) => void);
  }

  emit<E extends LishopEvent>(event: E, payload: LishopEventPayloads[E]): void {
    this.listeners.get(event)?.forEach((h) => h(payload));
  }
}

export { LishopEvent };
```

`src/index.ts`:
```ts
export { LishopEventBus, LishopEvent } from './event-bus';
export type { LishopEventPayloads } from './events';
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm --filter @lishop/event-bus test
```
Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add @lishop/event-bus package with typed EventEmitter"
```

---

## Task 7: @lishop/shared

**Files:**
- Create: `lishop-frontend/packages/shared/src/formatters/currency.ts`
- Create: `lishop-frontend/packages/shared/src/formatters/date.ts`
- Create: `lishop-frontend/packages/shared/src/hooks/use-debounce.ts`
- Create: `lishop-frontend/packages/shared/src/utils/cn.ts`

- [ ] **Step 1: Create package.json, tsconfig.json, and vitest.config.ts**

`package.json`:
```json
{
  "name": "@lishop/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest run", "type-check": "tsc --noEmit" },
  "peerDependencies": { "react": "^18 || ^19" },
  "dependencies": { "clsx": "^2.1.0", "tailwind-merge": "^2.3.0" },
  "devDependencies": { "@types/react": "^19.0.0", "vitest": "^1.0.0" }
}
```

`tsconfig.json`:
```json
{
  "extends": "@lishop/config/tsconfig",
  "compilerOptions": { "noEmit": true }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

```bash
pnpm --filter @lishop/shared install
```

- [ ] **Step 2: Write failing tests**

`src/__tests__/currency.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatVND, formatUSD } from '../formatters/currency';

describe('formatVND', () => {
  it('formats 100000 as a non-empty string containing 100', () => {
    const result = formatVND(100000);
    expect(result).toContain('100');
    expect(result.length).toBeGreaterThan(0);
  });
  it('formats 0 as a non-empty string containing 0', () => {
    const result = formatVND(0);
    expect(result).toContain('0');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatUSD', () => {
  it('formats 1999 cents containing 19.99', () => {
    expect(formatUSD(1999)).toContain('19.99');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm --filter @lishop/shared test
```
Expected: FAIL — `Cannot find module '../formatters/currency'`

- [ ] **Step 4: Implement formatters**

```ts
// src/formatters/currency.ts
export function formatVND(amountVnd: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amountVnd);
}

export function formatUSD(amountCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountCents / 100);
}
```

```ts
// src/formatters/date.ts
export function formatDate(iso: string, locale: 'vi' | 'en' = 'vi'): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
  }).format(new Date(iso));
}
```

```ts
// src/hooks/use-debounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debouncedValue;
}
```

```ts
// src/utils/cn.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

`src/index.ts`:
```ts
export * from './formatters/currency';
export * from './formatters/date';
export * from './hooks/use-debounce';
export * from './utils/cn';
```

- [ ] **Step 5: Run tests and verify pass**

```bash
pnpm --filter @lishop/shared test
```
Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add @lishop/shared package with formatters, debounce, cn"
```

---

## Task 8: @lishop/ui — Design System

**Files:**
- Create: `lishop-frontend/packages/ui/src/lib/utils.ts`
- Create: `lishop-frontend/packages/ui/src/components/button.tsx`
- Create: `lishop-frontend/packages/ui/src/components/input.tsx`
- Create: `lishop-frontend/packages/ui/src/components/card.tsx`
- Create: `lishop-frontend/packages/ui/src/components/badge.tsx`
- Create: `lishop-frontend/packages/ui/src/components/dialog.tsx`
- Create: `lishop-frontend/packages/ui/src/components/toast.tsx`
- Create: `lishop-frontend/packages/ui/src/__tests__/button.test.tsx`

- [ ] **Step 1: Create package.json, tsconfig.json, and vitest.config.ts**

`package.json` (includes `scripts` block so Turborepo can run tests):
```json
{
  "name": "@lishop/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.3.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": { "react": "^18 || ^19", "react-dom": "^18 || ^19" },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^24.0.0",
    "vitest": "^1.0.0"
  }
}
```

Also create `tsconfig.json`:
```json
{
  "extends": "@lishop/config/tsconfig",
  "compilerOptions": { "noEmit": true }
}
```

And `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
});
```

```bash
pnpm --filter @lishop/ui install
```

- [ ] **Step 2: Write failing test for Button**

`src/__tests__/button.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../components/button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });
});
```

- [ ] **Step 2b: Run test to verify it fails**

```bash
pnpm --filter @lishop/ui test
```
Expected: FAIL — `Cannot find module '../components/button'`

- [ ] **Step 3: Implement components using shadcn/ui patterns**

`src/lib/utils.ts`:
```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`src/components/button.tsx`:
```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

`src/components/input.tsx`:
```tsx
import * as React from 'react';
import { cn } from '../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
```

`src/components/card.tsx`:
```tsx
import * as React from 'react';
import { cn } from '../lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
```

`src/components/badge.tsx`:
```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

`src/components/dialog.tsx` — full shadcn Dialog with overlay and animations:
```tsx
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
        className
      )}
      {...props}
    >
      {children}
      <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogClose>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
};
```

`src/components/toast.tsx`:
```tsx
export { Toaster } from 'sonner';
export { toast } from 'sonner';
```

`src/index.ts`:
```ts
export * from './components/button';
export * from './components/input';
export * from './components/card';
export * from './components/badge';
export * from './components/dialog';
export * from './components/toast';
export * from './lib/utils';
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @lishop/ui test
```
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add @lishop/ui design system (Button, Input, Card, Badge, Dialog, Toast)"
```

---

## Task 9: Scaffold all 10 MFE apps

This task creates the Next.js 15 + Module Federation skeleton for all 10 apps. Shell is the host; the others are remotes.

**Files (per MFE):** `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Additional files:**
- Create: `lishop-frontend/docker-compose.yml`
- Create: `lishop-frontend/nginx.conf`

- [ ] **Step 1: Install shared Next.js dependencies**

For each app in `apps/`, create `package.json`. Example for `shell`:

`apps/shell/package.json`:
```json
{
  "name": "@lishop/shell",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@lishop/ui": "workspace:*",
    "@lishop/shared": "workspace:*",
    "@lishop/event-bus": "workspace:*",
    "@lishop/contracts": "workspace:*",
    "@module-federation/nextjs-mf": "^8.8.0",
    "@tanstack/react-query": "^5.50.0",
    "next": "^15.0.0",
    "next-intl": "^3.17.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@lishop/config": "workspace:*",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.5.0"
  }
}
```

For each remote MFE (mfe-auth through mfe-admin), use the same deps but with their own port in the `dev` script. Ports: auth=3001, catalog=3002, cart=3003, checkout=3004, orders=3005, profile=3006, promotions=3007, notifications=3008, admin=3009.

- [ ] **Step 2: Create shell next.config.ts (Module Federation host)**

`apps/shell/next.config.ts`:
```ts
import type { NextConfig } from 'next';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

const nextConfig: NextConfig = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'shell',
        remotes: {
          mfeAuth: `mfeAuth@${process.env.NEXT_PUBLIC_MFE_AUTH_URL}/_next/static/chunks/remoteEntry.js`,
          mfeCatalog: `mfeCatalog@${process.env.NEXT_PUBLIC_MFE_CATALOG_URL}/_next/static/chunks/remoteEntry.js`,
          mfeCart: `mfeCart@${process.env.NEXT_PUBLIC_MFE_CART_URL}/_next/static/chunks/remoteEntry.js`,
          mfeCheckout: `mfeCheckout@${process.env.NEXT_PUBLIC_MFE_CHECKOUT_URL}/_next/static/chunks/remoteEntry.js`,
          mfeOrders: `mfeOrders@${process.env.NEXT_PUBLIC_MFE_ORDERS_URL}/_next/static/chunks/remoteEntry.js`,
          mfeProfile: `mfeProfile@${process.env.NEXT_PUBLIC_MFE_PROFILE_URL}/_next/static/chunks/remoteEntry.js`,
          mfePromotions: `mfePromotions@${process.env.NEXT_PUBLIC_MFE_PROMOTIONS_URL}/_next/static/chunks/remoteEntry.js`,
          mfeNotifications: `mfeNotifications@${process.env.NEXT_PUBLIC_MFE_NOTIFICATIONS_URL}/_next/static/chunks/remoteEntry.js`,
          mfeAdmin: `mfeAdmin@${process.env.NEXT_PUBLIC_MFE_ADMIN_URL}/_next/static/chunks/remoteEntry.js`,
        },
        shared: {
          react: { singleton: true, requiredVersion: false },
          'react-dom': { singleton: true, requiredVersion: false },
          zustand: { singleton: true },
        },
      })
    );
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create remote MFE next.config.ts (example: mfe-auth)**

`apps/mfe-auth/next.config.ts`:
```ts
import type { NextConfig } from 'next';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

const nextConfig: NextConfig = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'mfeAuth',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './LoginPage': './src/app/login/page',
          './RegisterPage': './src/app/register/page',
        },
        shared: {
          react: { singleton: true, requiredVersion: false },
          'react-dom': { singleton: true, requiredVersion: false },
          zustand: { singleton: true },
        },
      })
    );
    return config;
  },
};

export default nextConfig;
```

Repeat for each remaining MFE using this table:

| App | `name` | `exposes` |
|-----|--------|-----------|
| mfe-catalog | `mfeCatalog` | `'./ProductListPage': './src/app/products/page'`, `'./ProductDetailPage': './src/app/products/[slug]/page'` |
| mfe-cart | `mfeCart` | `'./CartPage': './src/app/cart/page'`, `'./CartDrawer': './src/components/cart-drawer'` |
| mfe-checkout | `mfeCheckout` | `'./CheckoutPage': './src/app/checkout/page'` |
| mfe-orders | `mfeOrders` | `'./OrdersPage': './src/app/orders/page'`, `'./OrderDetailPage': './src/app/orders/[id]/page'` |
| mfe-profile | `mfeProfile` | `'./ProfilePage': './src/app/profile/page'` |
| mfe-promotions | `mfePromotions` | `'./PromotionsPage': './src/app/promotions/page'`, `'./CouponWidget': './src/components/coupon-widget'`, `'./FlashSaleBanner': './src/components/flash-sale-banner'` |
| mfe-notifications | `mfeNotifications` | `'./NotificationsPage': './src/app/notifications/page'` |
| mfe-admin | `mfeAdmin` | `'./AdminDashboard': './src/app/admin/page'` |

For the scaffold, each exposed file is a minimal placeholder component (returns `<div>MFE name</div>`).

- [ ] **Step 4: Create tsconfig.json for each app**

`apps/shell/tsconfig.json` (same pattern for all):
```json
{
  "extends": "@lishop/config/tsconfig",
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create minimal app/layout.tsx + page.tsx for each MFE**

`apps/shell/src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lishop',
  description: 'Lishop E-Commerce Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
```

`apps/shell/src/app/page.tsx`:
```tsx
export default function HomePage() {
  return <main><h1>Lishop</h1></main>;
}
```

For each remote MFE (`mfe-auth`, etc.), create minimal `layout.tsx` and `page.tsx` with MFE name as heading.

Also create `src/app/globals.css` for **every** app (shell + all 9 remote MFEs). This file is imported in `layout.tsx` and must exist or Next.js will fail to build:

```css
/* src/app/globals.css */
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}
```

Create this identical file in each app at `apps/<mfe-name>/src/app/globals.css`.

- [ ] **Step 6: Create docker-compose.yml for nginx proxy (frontend)**

`lishop-frontend/docker-compose.yml`:
```yaml
version: '3.9'
services:
  nginx:
    image: nginx:alpine
    ports:
      - '3000:80'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

`lishop-frontend/nginx.conf`:
```nginx
events { worker_connections 1024; }
http {
  upstream shell             { server host.docker.internal:3000; }
  upstream mfe_auth          { server host.docker.internal:3001; }
  upstream mfe_catalog       { server host.docker.internal:3002; }
  upstream mfe_cart          { server host.docker.internal:3003; }
  upstream mfe_checkout      { server host.docker.internal:3004; }
  upstream mfe_orders        { server host.docker.internal:3005; }
  upstream mfe_profile       { server host.docker.internal:3006; }
  upstream mfe_promotions    { server host.docker.internal:3007; }
  upstream mfe_notifications { server host.docker.internal:3008; }
  upstream mfe_admin         { server host.docker.internal:3009; }

  server {
    listen 80;
    location /auth/          { proxy_pass http://mfe_auth/; }
    location /products/      { proxy_pass http://mfe_catalog/; }
    location /cart/          { proxy_pass http://mfe_cart/; }
    location /checkout/      { proxy_pass http://mfe_checkout/; }
    location /orders/        { proxy_pass http://mfe_orders/; }
    location /profile/       { proxy_pass http://mfe_profile/; }
    location /promotions/    { proxy_pass http://mfe_promotions/; }
    location /notifications/ { proxy_pass http://mfe_notifications/; }
    location /admin/         { proxy_pass http://mfe_admin/; }
    location /               { proxy_pass http://shell/; }
  }
}
```

- [ ] **Step 6b: Create placeholder stubs for all exposed component files**

The `exposes` table in Step 3 references component files that don't exist as pages. Create each as a minimal placeholder so `tsc` and Module Federation resolve them. Examples:

`apps/mfe-cart/src/components/cart-drawer.tsx`:
```tsx
export default function CartDrawer() {
  return <div>CartDrawer (placeholder)</div>;
}
```

`apps/mfe-promotions/src/components/coupon-widget.tsx`:
```tsx
export default function CouponWidget() {
  return <div>CouponWidget (placeholder)</div>;
}
```

`apps/mfe-promotions/src/components/flash-sale-banner.tsx`:
```tsx
export default function FlashSaleBanner() {
  return <div>FlashSaleBanner (placeholder)</div>;
}
```

Also create the page stubs referenced in the `exposes` table for each MFE:
- `apps/mfe-auth/src/app/login/page.tsx` → `export default function LoginPage() { return <div>Login</div>; }`
- `apps/mfe-auth/src/app/register/page.tsx` → `export default function RegisterPage() { return <div>Register</div>; }`
- `apps/mfe-catalog/src/app/products/page.tsx` → `export default function ProductListPage() { return <div>Products</div>; }`
- `apps/mfe-catalog/src/app/products/[slug]/page.tsx` → `export default function ProductDetailPage() { return <div>Product Detail</div>; }`
- `apps/mfe-orders/src/app/orders/[id]/page.tsx` → `export default function OrderDetailPage() { return <div>Order Detail</div>; }`

All other MFE pages (`/cart`, `/checkout`, `/orders`, `/profile`, `/promotions`, `/notifications`, `/admin`) are already covered by the `src/app/page.tsx` stub from Step 5.

- [ ] **Step 7: Install all deps and verify build**

```bash
cd lishop-frontend
pnpm install
pnpm type-check
```
Expected: No TypeScript errors across all 10 MFE apps and all packages.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: scaffold all 10 MFE apps with Module Federation config"
```

---

## Task 10: NestJS API — Bootstrap & Core Infrastructure

**Files:**
- Create: `lishop-backend/apps/api/src/main.ts`
- Create: `lishop-backend/apps/api/src/app.module.ts`
- Create: `lishop-backend/apps/api/src/config/config.module.ts`
- Create: `lishop-backend/apps/api/src/health/health.controller.ts`
- Create: `lishop-backend/apps/api/src/common/filters/global-exception.filter.ts`
- Create: `lishop-backend/apps/api/src/common/interceptors/transform.interceptor.ts`
- Create: `lishop-backend/apps/api/src/common/interceptors/logging.interceptor.ts`
- Create: `lishop-backend/apps/api/src/common/pipes/validation.pipe.ts`
- Create: `lishop-backend/apps/api/src/common/decorators/roles.decorator.ts`
- Create: `lishop-backend/apps/api/src/common/decorators/current-user.decorator.ts`
- Create: `lishop-backend/apps/api/test/app.e2e-spec.ts`

- [ ] **Step 1: Create package.json, tsconfig.json, and nest-cli.json**

`apps/api/nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": ["**/*.json"]
  }
}
```

`apps/api/tsconfig.json`:
```json
{
  "extends": "@lishop/config/tsconfig",
  "compilerOptions": {
    "outDir": "./dist",
    "noEmit": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

`apps/api/package.json`:
```json
{
  "name": "@lishop/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "lint": "eslint src --ext .ts",
    "test": "jest --passWithNoTests",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@lishop/contracts": "workspace:*",
    "@lishop/database": "workspace:*",
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-fastify": "^10.0.0",
    "@nestjs/swagger": "^7.3.0",
    "@nestjs/throttler": "^6.1.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "fastify": "^4.28.0",
    "helmet": "^7.1.0",
    "joi": "^17.13.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@lishop/config": "workspace:*",
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.5.0"
  }
}
```

```bash
cd lishop-backend && pnpm --filter @lishop/api install
```

- [ ] **Step 2: Create jest-e2e.json and jest.config.ts**

`apps/api/test/jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "..",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "setupFiles": ["<rootDir>/test/setup-env.ts"]
}
```

`apps/api/test/setup-env.ts` — loads `.env` for local e2e runs (Jest doesn't read `.env` automatically):
```ts
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
```

Add `dotenv` to the API's devDependencies in `apps/api/package.json` (dotenv v16+ ships its own types — no `@types/dotenv` needed):
```json
"dotenv": "^16.4.0"
```

- [ ] **Step 3: Write failing e2e test**

`apps/api/test/app.e2e-spec.ts`:
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 with status ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ data: { status: 'ok' } });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
pnpm --filter @lishop/api test:e2e
```
Expected: FAIL — `Cannot find module '../src/app.module'`

- [ ] **Step 5: Implement config.module.ts**

```ts
// src/config/config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(4000),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
      }),
    }),
  ],
})
export class ConfigModule {}
```

- [ ] **Step 5: Implement global-exception.filter.ts**

```ts
// src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (status >= 500) {
      this.logger.error(exception);
    }

    reply.status(status).send({ error: message });
  }
}
```

- [ ] **Step 6: Implement transform.interceptor.ts**

```ts
// src/common/interceptors/transform.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
```

- [ ] **Step 7: Implement logging.interceptor.ts**

```ts
// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url } = req;
    const start = Date.now();
    return next.handle().pipe(
      tap(() => this.logger.log(`${method} ${url} — ${Date.now() - start}ms`))
    );
  }
}
```

- [ ] **Step 8: Implement validation.pipe.ts + decorators**

```ts
// src/common/pipes/validation.pipe.ts
import { ValidationPipe } from '@nestjs/common';

export const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
```

```ts
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@lishop/contracts';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

```ts
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return (request as FastifyRequest & { user?: unknown }).user;
  }
);
```

- [ ] **Step 9: Implement health.controller.ts**

```ts
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  check() {
    return { status: 'ok' };
  }
}
```

- [ ] **Step 10: Implement app.module.ts**

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validationPipe } from './common/pipes/validation.pipe';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_PIPE, useValue: validationPipe },
  ],
})
export class AppModule {}
```

- [ ] **Step 11: Implement main.ts**

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  );

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Lishop API')
    .setDescription('Lishop E-Commerce REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env['PORT'] ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.warn(`Lishop API listening on port ${port}`);
}

bootstrap();
```

- [ ] **Step 12: Ensure Docker services are running**

```bash
cd lishop-backend
docker compose ps
```
Expected: `postgres`, `redis`, and `meilisearch` containers all show `Up`. If not, run `docker compose up -d` and wait 10 seconds.

- [ ] **Step 13: Run e2e test**

The e2e test starts the full NestJS app, which requires `DATABASE_URL` and `REDIS_URL` to pass Joi validation at startup. Docker services must be healthy (verified in Step 12).

```bash
# Ensure .env exists with real values (not placeholders)
cp .env.example .env
# DATABASE_URL and REDIS_URL in .env must point to running Docker containers:
# DATABASE_URL=postgresql://lishop:lishop@localhost:5432/lishop
# REDIS_URL=redis://localhost:6379
pnpm --filter @lishop/api test:e2e
```
Expected: `GET /health returns 200 with status ok` — PASS.

- [ ] **Step 14: Commit**

```bash
git add -A && git commit -m "feat: add NestJS API core with Fastify, global filter, interceptors, Swagger"
```

---

## Task 11: Prisma Schema + @lishop/database

**Files:**
- Create: `lishop-backend/packages/database/prisma/schema.prisma`
- Create: `lishop-backend/packages/database/src/index.ts`
- Create: `lishop-backend/packages/database/prisma/seed.ts`

- [ ] **Step 1: package.json**

`packages/database/package.json`:
```json
{
  "name": "@lishop/database",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": { "@prisma/client": "^5.16.0", "bcrypt": "^5.1.0" },
  "devDependencies": { "@types/bcrypt": "^5.0.0", "prisma": "^5.16.0", "ts-node": "^10.9.0" }
}
```

- [ ] **Step 2: schema.prisma**

`packages/database/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  CUSTOMER
  ADMIN
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum ReviewStatus {
  PENDING
  APPROVED
  REJECTED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum PaymentMethod {
  STRIPE
  PAYPAL
  VNPAY
  MOMO
  COD
}

enum CouponType {
  PERCENT
  FIXED
  FREE_SHIPPING
}

model User {
  id             String    @id @default(uuid())
  email          String    @unique
  passwordHash   String?
  firstName      String
  lastName       String
  avatarUrl      String?
  role           UserRole  @default(CUSTOMER)
  loyaltyPoints  Int       @default(0)
  emailVerified  Boolean   @default(false)
  googleId       String?   @unique
  facebookId     String?   @unique
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  addresses           Address[]
  orders              Order[]
  reviews             Review[]
  cartItems           CartItem[]
  loyaltyTransactions LoyaltyPoint[]
  deviceTokens        DeviceToken[]
  notificationPrefs   NotificationPreference[]
  couponUsages        CouponUsage[]

  @@index([email])
}

model Address {
  id        String   @id @default(uuid())
  userId    String
  fullName  String
  phone     String
  street    String
  district  String
  city      String
  country   String   @default("VN")
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders Order[]

  @@index([userId])
}

model Category {
  id        String     @id @default(uuid())
  name      String
  slug      String     @unique
  imageUrl  String?
  parentId  String?
  createdAt DateTime   @default(now())

  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  products Product[]

  @@index([slug])
  @@index([parentId])
}

model Product {
  id            String    @id @default(uuid())
  name          String
  slug          String    @unique
  description   String
  priceVnd      Int
  priceUsd      Int
  stock         Int       @default(0)
  categoryId    String
  averageRating Float     @default(0)
  reviewCount   Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  category       Category       @relation(fields: [categoryId], references: [id])
  images         ProductImage[]
  tags           ProductTag[]
  reviews        Review[]
  cartItems      CartItem[]
  orderItems     OrderItem[]
  flashSaleItems FlashSaleItem[]

  @@index([slug])
  @@index([categoryId])
  @@index([createdAt])
  @@index([priceVnd])
}

model ProductImage {
  id        String  @id @default(uuid())
  productId String
  url       String
  alt       String?
  isPrimary Boolean @default(false)

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}

model Tag {
  id   String @id @default(uuid())
  name String @unique

  productTags ProductTag[]
}

model ProductTag {
  productId String
  tagId     String

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag     Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
}

model CartItem {
  id        String   @id @default(uuid())
  userId    String
  productId String
  quantity  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@unique([userId, productId])
  @@index([userId])
}

model Order {
  id             String      @id @default(uuid())
  orderNumber    String      @unique
  userId         String
  addressId      String
  status         OrderStatus @default(PENDING)
  subtotalVnd    Int
  shippingFeeVnd Int         @default(0)
  discountVnd    Int         @default(0)
  totalVnd       Int
  notes          String?
  trackingNumber String?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  user     User        @relation(fields: [userId], references: [id])
  address  Address     @relation(fields: [addressId], references: [id])
  items    OrderItem[]
  payment  Payment?
  shipment Shipment?

  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

model OrderItem {
  id            String  @id @default(uuid())
  orderId       String
  productId     String
  productName   String
  quantity      Int
  unitPriceVnd  Int
  totalPriceVnd Int

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@index([orderId])
}

model Payment {
  id          String        @id @default(uuid())
  orderId     String        @unique
  method      PaymentMethod
  amountVnd   Int
  status      PaymentStatus @default(PENDING)
  providerRef String?
  invoiceUrl  String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  order Order @relation(fields: [orderId], references: [id])
}

model Shipment {
  id             String   @id @default(uuid())
  orderId        String   @unique
  provider       String
  trackingNumber String?
  estimatedAt    DateTime?
  shippedAt      DateTime?
  deliveredAt    DateTime?

  order Order @relation(fields: [orderId], references: [id])
}

model Review {
  id              String       @id @default(uuid())
  productId       String
  userId          String
  rating          Int
  content         String
  status          ReviewStatus @default(PENDING)
  verifiedPurchase Boolean     @default(false)
  createdAt       DateTime     @default(now())

  product Product @relation(fields: [productId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([productId, userId])
  @@index([productId])
  @@index([status])
}

model Coupon {
  id          String     @id @default(uuid())
  code        String     @unique
  type        CouponType
  value       Int
  minOrderVnd Int        @default(0)
  maxUses     Int?
  usedCount   Int        @default(0)
  expiresAt   DateTime?
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())

  usages CouponUsage[]

  @@index([code])
}

model CouponUsage {
  id       String   @id @default(uuid())
  couponId String
  userId   String
  usedAt   DateTime @default(now())

  coupon Coupon @relation(fields: [couponId], references: [id])
  user   User   @relation(fields: [userId], references: [id])

  @@unique([couponId, userId])
}

model FlashSale {
  id        String    @id @default(uuid())
  startAt   DateTime
  endAt     DateTime
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())

  items FlashSaleItem[]
}

model FlashSaleItem {
  id              String @id @default(uuid())
  flashSaleId     String
  productId       String
  discountPercent Int

  flashSale FlashSale @relation(fields: [flashSaleId], references: [id])
  product   Product   @relation(fields: [productId], references: [id])

  @@unique([flashSaleId, productId])
}

model LoyaltyPoint {
  id          String   @id @default(uuid())
  userId      String
  points      Int
  description String
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}

model DeviceToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  platform  String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}

model NotificationPreference {
  id         String  @id @default(uuid())
  userId     String
  eventType  String
  emailEnabled Boolean @default(true)
  pushEnabled  Boolean @default(true)
  inAppEnabled Boolean @default(true)

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, eventType])
  @@index([userId])
}
```

- [ ] **Step 3: src/index.ts**

```ts
// packages/database/src/index.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  global.__prisma = prisma;
}

export * from '@prisma/client';
```

- [ ] **Step 4: seed.ts**

`packages/database/prisma/seed.ts`:
```ts
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminHash = await bcrypt.hash('Admin@12345', 10);
  await prisma.user.upsert({
    where: { email: 'admin@lishop.vn' },
    update: {},
    create: {
      email: 'admin@lishop.vn',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'Lishop',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  // Root categories
  const categories = ['Electronics', 'Fashion', 'Home & Living', 'Sports', 'Books'];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { slug: name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-') },
      update: {},
      create: {
        name,
        slug: name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-'),
      },
    });
  }

  console.warn('Seed complete');
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 5: Generate Prisma client and run migrations**

```bash
cd lishop-backend
pnpm --filter @lishop/database install
# migrate dev generates the client automatically — no need to run db:generate separately
pnpm --filter @lishop/database exec prisma migrate dev --name init
pnpm --filter @lishop/database db:seed
```
Expected: Migration `init` created in `prisma/migrations/`. Prisma Client auto-generated. Seed output: `Seed complete`.

- [ ] **Step 6: Verify migration applied**

```bash
docker exec -it lishop-backend-postgres-1 psql -U lishop -d lishop -c "\dt"
```
Expected: All tables listed (User, Product, Order, etc.)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add Prisma schema with all domain models and seed"
```

---

## Task 12: CI Workflows

**Files:**
- Create: `lishop-frontend/.github/workflows/ci.yml`
- Create: `lishop-backend/.github/workflows/ci.yml`

- [ ] **Step 1: Frontend CI**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 2: Backend CI**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: lishop
          POSTGRES_PASSWORD: lishop
          POSTGRES_DB: lishop_test
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    env:
      DATABASE_URL: postgresql://lishop:lishop@localhost:5432/lishop_test
      REDIS_URL: redis://localhost:6379
      JWT_ACCESS_SECRET: test-access-secret
      JWT_REFRESH_SECRET: test-refresh-secret
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @lishop/database db:generate
      - run: pnpm --filter @lishop/database exec prisma migrate deploy
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
      - run: pnpm --filter @lishop/api test:e2e
```

- [ ] **Step 3: Commit both**

```bash
# in lishop-frontend
git add -A && git commit -m "ci: add GitHub Actions CI workflow"

# in lishop-backend
git add -A && git commit -m "ci: add GitHub Actions CI workflow with Postgres + Redis services"
```

---

## Plan 1 Complete — Verification Checklist

Before marking Plan 1 done, verify:

- [ ] `cd lishop-frontend && pnpm install && pnpm build` — all 10 MFE apps build without errors
- [ ] `pnpm test` — event-bus, shared, ui tests all pass
- [ ] `pnpm type-check` — zero TypeScript errors across all packages
- [ ] `cd lishop-backend && docker compose up -d` — postgres, redis, meilisearch all healthy
- [ ] `pnpm --filter @lishop/api test:e2e` — `GET /health → 200 { data: { status: 'ok' } }` passes
- [ ] `curl http://localhost:4000/health` — returns `{"data":{"status":"ok"}}`
- [ ] `curl http://localhost:4000/api/docs` — Swagger UI loads
- [ ] Prisma migrations applied, seed data in DB

---

*Next: Plan 2 — Auth (api/modules/auth, shell layout, mfe-auth)*

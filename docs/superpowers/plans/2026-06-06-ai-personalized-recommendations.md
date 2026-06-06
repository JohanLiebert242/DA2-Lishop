# AI Personalized Recommendations (Customer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a customer-facing "Danh cho ban" recommendations section in `mfe-catalog` backed by a new backend endpoint that personalizes using wishlist + recent orders, with optional OpenAI rerank/explanation and reliable fallback.

**Architecture:** Backend generates deterministic candidate products from wishlist + recent order items, then optionally calls OpenAI Responses API to rerank and produce a short reason. Frontend fetches and renders the section on `/products` (and `/` redirects there), with stable `data-testid`s for Playwright.

**Tech Stack:** NestJS (Fastify), Prisma, Next.js (App Router), React Query, Playwright.

---

## File Map (Create/Modify)

Backend (`lishop-backend/apps/api`):
- Create: `src/modules/auth/guards/optional-jwt-auth.guard.ts`
- Create: `src/modules/products/products.recommendations.controller.ts`
- Modify: `src/modules/products/products.module.ts`
- Modify: `src/modules/products/products.service.ts`
- Modify: `src/modules/products/products.repository.ts`
- Modify: `src/modules/products/products.service.spec.ts`

Frontend (`lishop-frontend/apps/mfe-catalog`):
- Modify: `src/lib/catalog-api.ts`
- Create: `src/components/personalized-recommendations.tsx`
- Modify: `src/app/products/product-list-client.tsx`

E2E (`lishop-frontend/tests/e2e`):
- Create: `tests/e2e/catalog-personalized-recommendations.spec.ts`

---

### Task 1: Backend - Optional Auth Guard

**Files:**
- Create: `lishop-backend/apps/api/src/modules/auth/guards/optional-jwt-auth.guard.ts`
- (No dedicated unit test; behavior is exercised via recommendations tests)

- [ ] **Step 1: Implement OptionalJwtAuthGuard**

```ts
// lishop-backend/apps/api/src/modules/auth/guards/optional-jwt-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtService } from '../jwt.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractBearerToken(request);
    if (!token) return true;

    try {
      const payload = await this.jwtService.verifyAccessToken(token);
      if (!payload) return true;

      if (payload.jti) {
        const blacklisted = await this.redisService.exists(`blacklist:token:${payload.jti}`);
        if (blacklisted) return true;
      }

      (request as any).user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      // treat as guest
      return true;
    }
  }

  private extractBearerToken(request: FastifyRequest): string | null {
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return (request.cookies as Record<string, string>)?.['lishop_at'] ?? null;
  }
}
```

- [ ] **Step 2: Typecheck backend build**

Run:
```powershell
cd c:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend/apps/api
corepack pnpm -s build
```
Expected: succeeds.

---

### Task 2: Backend - Recommendations Endpoint + Heuristic + Optional AI Rerank

**Files:**
- Create: `lishop-backend/apps/api/src/modules/products/products.recommendations.controller.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/products.module.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/products.repository.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/products.service.ts`
- Test: `lishop-backend/apps/api/src/modules/products/products.service.spec.ts`

- [ ] **Step 1: Write failing tests for service**

Add tests that assert:
1) no `OPENAI_API_KEY` => `fallback: true` + returns items (featured if no user)
2) `OPENAI_API_KEY` set but OpenAI fetch fails => `fallback: true`
3) `OPENAI_API_KEY` set and OpenAI returns rerank + reason => `fallback: false`

Skeleton (adapt to existing test harness/mocks in this file):
```ts
describe('recommendations', () => {
  it('returns fallback recommendations when OPENAI_API_KEY is missing', async () => {
    config.get.mockImplementation((k: string) => (k === 'OPENAI_API_KEY' ? '' : undefined));
    repo.findFeatured.mockResolvedValue([/* ...product fixtures... */]);

    const result = await service.getPersonalizedRecommendations(undefined, 4, 'products');
    expect(result.fallback).toBe(true);
    expect(result.items).toHaveLength(4);
  });

  it('falls back when OpenAI request fails', async () => {
    config.get.mockImplementation((k: string) => (k === 'OPENAI_API_KEY' ? 'k' : undefined));
    // mock global fetch to throw / non-ok
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    repo.findFeatured.mockResolvedValue([/* ... */]);

    const result = await service.getPersonalizedRecommendations(undefined, 4, 'products');
    expect(result.fallback).toBe(true);
  });

  it('uses AI rerank and returns a reason when OpenAI succeeds', async () => {
    config.get.mockImplementation((k: string) => (k === 'OPENAI_API_KEY' ? 'k' : (k === 'OPENAI_MODEL' ? 'gpt-5.2' : undefined)));
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify({ slugs: ['p-1'], reason: 'Vi ban hay mua do uong.' }) }),
    });
    repo.findFeatured.mockResolvedValue([/* fixture with slug 'p-1' ... */]);

    const result = await service.getPersonalizedRecommendations(undefined, 1, 'home');
    expect(result.fallback).toBe(false);
    expect(result.reason).toContain('Vi');
    expect(result.items[0].slug).toBe('p-1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```powershell
cd c:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend/apps/api
corepack pnpm -s test src/modules/products/products.service.spec.ts
```
Expected: FAIL because `getPersonalizedRecommendations` does not exist yet (or similar).

- [ ] **Step 3: Implement repository helpers**

Add minimal methods needed by recommendations:
- `findFeatured(limit)`
- `findByIds(ids)`
- `findByCategoryOrTag(categoryIds, tagIds, excludeIds, limit)`

Example (shape only; follow existing prisma patterns in the repo):
```ts
async findByIds(ids: string[]) { /* prisma.product.findMany where id in ids include category/images/tags */ }
async findForRecommendationSignals(userId: string) { /* optional: if repo already knows how */ }
async findByCategoryOrTag(categoryIds: string[], tagIds: string[], excludeIds: string[], limit: number) { /* ... */ }
```

- [ ] **Step 4: Implement service method + AI rerank**

Add to `ProductsService`:
- `getPersonalizedRecommendations(userId?: string, limit = 8, context?: string)`

Implementation notes:
- Gather signals:
  - Wishlist product ids via WishlistRepository (preferred: inject WishlistRepository directly) OR query prisma through ProductsRepository if it already has access patterns.
  - Recent orders: use OrdersRepository/service if injection is easy; otherwise query prisma for last N orders for user and collect productIds.
- Candidate list:
  - First: products from wishlist + purchased items (by id).
  - Next: `findByCategoryOrTag` from those products' categoryId + tagIds.
  - Filter `stock > 0`, dedupe, cap to `limit`.
- AI:
  - When key exists, call Responses API and ask for JSON: `{ slugs: string[], reason: string }`
  - Only accept slugs present in candidates; otherwise fallback.
- Return:
  - `{ items, reason, fallback }`

- [ ] **Step 5: Create controller for endpoint**

Create `ProductsRecommendationsController` on prefix `products`:
- `GET /products/recommendations`
- `@UseGuards(OptionalJwtAuthGuard, RolesGuard)` so it can read `request.user` when present but allow guests
- Parse `limit` and `context` query params.

- [ ] **Step 6: Wire controller in ProductsModule**

Add new controller to `controllers: [...]`.

- [ ] **Step 7: Run backend unit tests**

Run:
```powershell
cd c:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend/apps/api
corepack pnpm -s test
```
Expected: PASS.

- [ ] **Step 8: Commit backend**

```powershell
git -C c:/Users/nguye/OneDrive/Desktop/DA2 add lishop-backend/apps/api/src/modules/auth/guards/optional-jwt-auth.guard.ts lishop-backend/apps/api/src/modules/products
git -C c:/Users/nguye/OneDrive/Desktop/DA2 commit -m "feat(api): personalized product recommendations"
```

---

### Task 3: Frontend - Catalog API + Component

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`
- Create: `lishop-frontend/apps/mfe-catalog/src/components/personalized-recommendations.tsx`
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/product-list-client.tsx`

- [ ] **Step 1: Add API types + method**

In `catalog-api.ts`, add:
- `PersonalizedRecommendationResponse` type
- `getRecommendations(limit, context)`

```ts
export interface PersonalizedRecommendationResponse {
  items: AiDiscoveryProduct[];
  reason?: string;
  fallback: boolean;
}

getRecommendations: (limit = 8, context: 'home' | 'products' = 'products') =>
  apiFetch<PersonalizedRecommendationResponse>(`/products/recommendations?limit=${limit}&context=${context}`),
```

- [ ] **Step 2: Build `PersonalizedRecommendations` component**

Client component that:
- uses React Query to fetch `catalogApi.getRecommendations(8, context)`
- renders section with `data-testid="personalized-recs"`
- renders each item with `data-testid="personalized-rec-item-${product.slug}"`
- skeleton while loading
- shows `reason` (muted text) if present

- [ ] **Step 3: Insert into `/products` page**

In `product-list-client.tsx`, render `PersonalizedRecommendations context="products"` near the top (ideally above filters but below the existing AI discovery section, so it feels additive).

- [ ] **Step 4: Run mfe-catalog build**

```powershell
cd c:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend/apps/mfe-catalog
corepack pnpm -s build
```

- [ ] **Step 5: Commit frontend**

```powershell
git -C c:/Users/nguye/OneDrive/Desktop/DA2 add lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts lishop-frontend/apps/mfe-catalog/src/components/personalized-recommendations.tsx lishop-frontend/apps/mfe-catalog/src/app/products/product-list-client.tsx
git -C c:/Users/nguye/OneDrive/Desktop/DA2 commit -m "feat(catalog): show personalized recommendations"
```

---

### Task 4: Playwright E2E - Recommendations Section

**Files:**
- Create: `lishop-frontend/tests/e2e/catalog-personalized-recommendations.spec.ts`

- [ ] **Step 1: Write E2E spec (route-stub endpoint)**

Test outline:
- go to catalog `/products`
- `page.route('**/products/recommendations**', ...)` fulfill JSON with 2 items
- IMPORTANT: `if (route.request().resourceType() === 'document') return route.fallback();`
- assert section appears and contains the stubbed items by `data-testid`

```ts
import { test, expect } from '@playwright/test';

test('catalog shows personalized recommendations block', async ({ page }) => {
  await page.route('**/products/recommendations**', async (route) => {
    if (route.request().resourceType() === 'document') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fallback: false,
        reason: 'Vi ban hay mua do uong.',
        items: [
          { id: 'p1', name: 'Tra sua it duong', slug: 'tra-sua-it-duong', description: '...', priceVnd: 55000, stock: 10, averageRating: 4.7, reviewCount: 31, brand: 'Lishop', category: { id: 'c1', name: 'Do uong', slug: 'do-uong' }, images: [] },
          { id: 'p2', name: 'Banh hanh nhan', slug: 'banh-hanh-nhan', description: '...', priceVnd: 89000, stock: 5, averageRating: 4.6, reviewCount: 18, brand: 'Lishop', category: { id: 'c2', name: 'An vat', slug: 'an-vat' }, images: [] },
        ],
      }),
    });
  });

  await page.goto('/products');

  await expect(page.getByTestId('personalized-recs')).toBeVisible();
  await expect(page.getByTestId('personalized-rec-item-tra-sua-it-duong')).toBeVisible();
  await expect(page.getByTestId('personalized-rec-item-banh-hanh-nhan')).toBeVisible();
});
```

- [ ] **Step 2: Run Playwright**

```powershell
cd c:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend
corepack pnpm -s test:e2e
```
Expected: PASS.

- [ ] **Step 3: Commit E2E**

```powershell
git -C c:/Users/nguye/OneDrive/Desktop/DA2 add lishop-frontend/tests/e2e/catalog-personalized-recommendations.spec.ts
git -C c:/Users/nguye/OneDrive/Desktop/DA2 commit -m "test(e2e): cover personalized recommendations"
```

---

### Task 5: Full Verification + Final Commit (if needed)

- [ ] **Step 1: Run backend tests**
```powershell
cd c:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend/apps/api
corepack pnpm -s test
```

- [ ] **Step 2: Run frontend checks**
```powershell
cd c:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend
corepack pnpm -s lint
corepack pnpm -s test:e2e
```

- [ ] **Step 3: Ensure git clean (ignore untracked artifacts)**
```powershell
git -C c:/Users/nguye/OneDrive/Desktop/DA2 status --porcelain
```

- [ ] **Step 4: Final commit (only if Task commits were not done incrementally)**
```powershell
git -C c:/Users/nguye/OneDrive/Desktop/DA2 commit -am "feat: AI personalized recommendations"
```


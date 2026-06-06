# AI Product Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-assisted natural-language product discovery to the catalog with grounded backend responses and Playwright coverage.

**Architecture:** The backend exposes a public `POST /products/ai-discovery` endpoint on the existing products module. `ProductsService` searches catalog data first, then optionally calls OpenAI Responses API with compact product context; the frontend renders an additive assistant panel above product results.

**Tech Stack:** NestJS, TypeScript, Next.js, React Query, Playwright, OpenAI Responses API via `fetch`.

---

### Task 1: Backend AI Discovery Contract

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/products/products.service.spec.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/products.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/products.controller.ts`

- [ ] **Step 1: Write failing backend tests**

Add tests for `discoverWithAi` covering OpenAI success, no-key fallback, OpenAI failure fallback, and compare mode.

- [ ] **Step 2: Run focused test and confirm RED**

Run: `corepack pnpm --filter @lishop/api test -- products.service.spec.ts`

Expected: failure because `discoverWithAi` does not exist.

- [ ] **Step 3: Implement minimal backend behavior**

Add request/response interfaces, product summarization, prompt construction, OpenAI `fetch`, fallback behavior, and controller route.

- [ ] **Step 4: Run focused test and confirm GREEN**

Run: `corepack pnpm --filter @lishop/api test -- products.service.spec.ts`

Expected: all products service tests pass.

- [ ] **Step 5: Commit backend task**

Run: `git add ... && git commit -m "feat: add AI product discovery API"`

### Task 2: Catalog UI

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/product-list-client.tsx`

- [ ] **Step 1: Add API client types and method**

Add `AiDiscoveryResponse` and `catalogApi.discoverProducts(message)`.

- [ ] **Step 2: Add assistant panel**

Add a compact AI discovery panel above the product grid with input, submit, loading, error, reply, and product suggestions.

- [ ] **Step 3: Run frontend type-check**

Run: `corepack pnpm --filter @lishop/mfe-catalog type-check`

Expected: pass.

- [ ] **Step 4: Commit frontend task**

Run: `git add ... && git commit -m "feat: add catalog AI discovery panel"`

### Task 3: Playwright Coverage and Full Verification

**Files:**
- Modify or create: `lishop-frontend/tests/e2e/catalog-ai-discovery.spec.ts`

- [ ] **Step 1: Add Playwright test**

Mock `POST /products/ai-discovery`, enter a natural-language request, and assert the assistant reply and product suggestion are visible.

- [ ] **Step 2: Run e2e test**

Run: `corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/catalog-ai-discovery.spec.ts`

Expected: pass against running dev servers.

- [ ] **Step 3: Run final verification**

Run:
- `corepack pnpm --filter @lishop/api test -- products.service.spec.ts`
- `corepack pnpm --filter @lishop/api type-check`
- `corepack pnpm --filter @lishop/mfe-catalog type-check`
- `corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/catalog-ai-discovery.spec.ts`

Expected: all pass.

- [ ] **Step 4: Commit e2e task**

Run: `git add ... && git commit -m "test: cover catalog AI discovery"`

# AI Shopping Concierge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a customer-facing AI Shopping Concierge that recommends products and proposes a cart plan the customer can explicitly add to cart.

**Architecture:** Backend adds a focused `ShoppingModule` with `POST /shopping/concierge`, backed by `ProductsService.findMany`, OpenAI Responses API, and deterministic fallback. Frontend upgrades the catalog chat widget to call the new endpoint, render a suggested cart plan, and only mutate cart after customer clicks add.

**Tech Stack:** NestJS, Jest, OpenAI Responses API through `fetch`, Next.js catalog MFE, React state, existing cart helper, Playwright.

---

## File Structure

- `lishop-backend/apps/api/src/modules/shopping/shopping-concierge.service.spec.ts`: TDD tests for concierge behavior.
- `lishop-backend/apps/api/src/modules/shopping/shopping-concierge.service.ts`: AI/fallback recommendation and cart-plan logic.
- `lishop-backend/apps/api/src/modules/shopping/shopping.controller.ts`: `POST /shopping/concierge`.
- `lishop-backend/apps/api/src/modules/shopping/shopping.module.ts`: module wiring.
- `lishop-backend/apps/api/src/app.module.ts`: import `ShoppingModule`.
- `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`: response types and `shoppingConcierge`.
- `lishop-frontend/apps/mfe-catalog/src/components/chat-widget.tsx`: Concierge UI, cart-plan rendering, add buttons.
- `lishop-frontend/tests/e2e/catalog-shopping-concierge.spec.ts`: Playwright coverage for cart-plan UI and add action.

### Task 1: Backend Concierge API

**Files:**
- Create: `lishop-backend/apps/api/src/modules/shopping/shopping-concierge.service.spec.ts`
- Create: `lishop-backend/apps/api/src/modules/shopping/shopping-concierge.service.ts`
- Create: `lishop-backend/apps/api/src/modules/shopping/shopping.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/shopping/shopping.module.ts`
- Modify: `lishop-backend/apps/api/src/app.module.ts`

- [ ] **Step 1: Write failing service tests**

Create tests for:

- OpenAI success parses structured reply, cart plan, and actions.
- Missing OpenAI key returns fallback with in-stock products.
- OpenAI failure returns fallback.
- Out-of-stock products are excluded from cart plan.

- [ ] **Step 2: Run tests to verify RED**

Run: `corepack pnpm --filter @lishop/api test -- shopping-concierge.service.spec.ts`

Expected: fail because files/classes do not exist.

- [ ] **Step 3: Implement backend code**

Implement `ShoppingConciergeService.ask(message)`, response interfaces, OpenAI prompt, parser, fallback, controller, module, and app module import.

- [ ] **Step 4: Run backend focused verification**

Run:

```powershell
corepack pnpm --filter @lishop/api test -- shopping-concierge.service.spec.ts
corepack pnpm --filter @lishop/api type-check
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit backend API**

```powershell
git add -- lishop-backend/apps/api/src/modules/shopping lishop-backend/apps/api/src/app.module.ts
git commit -m "feat: add AI shopping concierge API"
```

### Task 2: Catalog Concierge UI

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`
- Modify: `lishop-frontend/apps/mfe-catalog/src/components/chat-widget.tsx`

- [ ] **Step 1: Add frontend API contract**

Add `ShoppingConciergeResponse`, `ConciergeCartItem`, `ConciergeAction`, and `catalogApi.shoppingConcierge(message)`.

- [ ] **Step 2: Upgrade chat widget**

Make `ChatWidget` call `catalogApi.shoppingConcierge`, render returned `items` and `cartPlan`, and use existing `addToCart` helper when customer clicks add buttons.

- [ ] **Step 3: Run catalog type-check**

Run: `corepack pnpm --filter @lishop/mfe-catalog type-check`

Expected: command exits 0.

- [ ] **Step 4: Commit frontend UI**

```powershell
git add -- lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts lishop-frontend/apps/mfe-catalog/src/components/chat-widget.tsx
git commit -m "feat: add catalog AI shopping concierge"
```

### Task 3: Playwright E2E

**Files:**
- Create: `lishop-frontend/tests/e2e/catalog-shopping-concierge.spec.ts`

- [ ] **Step 1: Write e2e test**

Mock `POST /shopping/concierge` and `POST /cart/items`. Navigate to catalog, open chat, ask a shopping request, assert cart plan appears, click add all, and assert cart endpoint was called.

- [ ] **Step 2: Run Playwright spec**

Run:

```powershell
$out = "test-results-concierge-$(Get-Date -Format 'yyyyMMdd-HHmmss')"; corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/catalog-shopping-concierge.spec.ts --output=$out
```

Expected: 1 test passes.

- [ ] **Step 3: Commit e2e test**

```powershell
git add -- lishop-frontend/tests/e2e/catalog-shopping-concierge.spec.ts
git commit -m "test: cover catalog AI shopping concierge"
```

### Task 4: Final Verification

**Files:**
- No source edits expected.

- [ ] **Step 1: Run backend full tests**

Run: `corepack pnpm --filter @lishop/api test`

Expected: all Jest suites pass.

- [ ] **Step 2: Run type-checks**

Run:

```powershell
corepack pnpm --filter @lishop/api type-check
corepack pnpm --filter @lishop/mfe-catalog type-check
```

Expected: both commands exit 0.

- [ ] **Step 3: Run Playwright e2e**

Run the Shopping Concierge Playwright command from Task 3 again.

Expected: 1 test passes.

- [ ] **Step 4: Inspect git status**

Run: `git status --short`

Expected: only unrelated runtime artifacts remain uncommitted.

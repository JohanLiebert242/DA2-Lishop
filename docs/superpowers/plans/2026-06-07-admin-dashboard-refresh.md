# Admin Dashboard Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/admin` into a real dashboard and refresh the admin experience with richer visuals, icons, and light imagery while preserving existing routes and Playwright-visible behaviors.

**Architecture:** Build a small set of reusable admin presentation components first, then re-skin the shell and key pages around them. Keep the existing API/query logic and test ids stable so the redesign is mostly additive around current behaviors.

**Tech Stack:** Next.js App Router, React Query, Recharts, Tailwind CSS, Playwright, lucide-react

---

### Task 1: Add dashboard regression coverage

**Files:**
- Create: `lishop-frontend/tests/e2e/admin-dashboard.spec.ts`
- Test: `lishop-frontend/tests/e2e/admin-dashboard.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';

test.describe('admin dashboard', () => {
  test('loads /admin as a dashboard instead of redirecting to orders', async ({ page, context }) => {
    await context.addCookies([
      { name: 'lishop_session', value: '1', domain: 'localhost', path: '/' },
    ]);

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }),
      });
    });

    await page.route('**/admin/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { orderCount: 42, revenueVnd: 125000000, userCount: 320, productCount: 86 } }),
      });
    });

    await page.route('**/admin/analytics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            summary: { revenueVnd: 125000000, orderCount: 42, averageOrderValueVnd: 2976190, newUsers: 18 },
            dailyRevenue: [{ date: '2026-06-06', amount: 5200000 }],
            topProducts: [{ productId: 'p1', productName: 'Ao khoac premium', revenue: 18500000 }],
            orderStatusBreakdown: [{ status: 'PENDING', count: 8 }, { status: 'DELIVERED', count: 21 }],
            lowStockProducts: [{ id: 'p-low', name: 'Ao khoac premium', slug: 'ao-khoac-premium', stock: 3 }],
          },
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin`, { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/125\.000\.000|125,000,000/)).toBeVisible();
    await expect(page.getByText(/Ao khoac premium/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-dashboard.spec.ts`

Expected: FAIL because `/admin` currently redirects to `/admin/orders` and does not render a dashboard heading.

- [ ] **Step 3: Write minimal implementation**

Implement a real `/admin` page that renders dashboard content and keeps existing auth/layout behavior untouched.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-dashboard.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lishop-frontend/tests/e2e/admin-dashboard.spec.ts lishop-frontend/apps/mfe-admin/src/app/admin/page.tsx
git commit -m "test: cover admin dashboard landing page"
```

### Task 2: Add reusable admin presentation primitives

**Files:**
- Create: `lishop-frontend/apps/mfe-admin/src/app/admin/_components/admin-page-header.tsx`
- Create: `lishop-frontend/apps/mfe-admin/src/app/admin/_components/admin-metric-card.tsx`
- Create: `lishop-frontend/apps/mfe-admin/src/app/admin/_components/admin-empty-state.tsx`
- Create: `lishop-frontend/apps/mfe-admin/src/app/admin/_components/admin-shell-illustration.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/package.json`

- [ ] **Step 1: Write the failing test**

Use the dashboard spec from Task 1 as the safety net and make sure new components are introduced without changing tested semantics.

- [ ] **Step 2: Run test to verify current UI still fails on the intended dashboard behavior**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-dashboard.spec.ts`

Expected: FAIL if Task 1 is not green yet, otherwise keep as regression safety for next steps.

- [ ] **Step 3: Write minimal implementation**

Create shared components for page hero blocks, KPI cards, empty states, and lightweight decorative illustrations. Add `lucide-react` to `mfe-admin` so the app can use icons directly.

- [ ] **Step 4: Run focused verification**

Run: `pnpm --filter @lishop/mfe-admin type-check`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lishop-frontend/apps/mfe-admin/src/app/admin/_components lishop-frontend/apps/mfe-admin/package.json
git commit -m "feat: add reusable admin presentation components"
```

### Task 3: Refresh the admin shell and navigation

**Files:**
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/layout.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/_constants.ts`

- [ ] **Step 1: Write the failing test**

Rely on existing admin Playwright specs that already load authenticated admin routes and expect the shell to remain usable:

- `lishop-frontend/tests/e2e/admin-ai-analytics-insights.spec.ts`
- `lishop-frontend/tests/e2e/admin-ai-product-copy.spec.ts`

- [ ] **Step 2: Run tests to verify the shell baseline**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-ai-analytics-insights.spec.ts tests/e2e/admin-ai-product-copy.spec.ts`

Expected: PASS before refactor, establishing the safety net.

- [ ] **Step 3: Write minimal implementation**

Upgrade the shell with icon-based nav items, grouped sections, stronger active states, richer top stats, and a brighter dashboard frame while keeping route paths and auth checks unchanged.

- [ ] **Step 4: Re-run the shell safety tests**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-ai-analytics-insights.spec.ts tests/e2e/admin-ai-product-copy.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lishop-frontend/apps/mfe-admin/src/app/admin/layout.tsx lishop-frontend/apps/mfe-admin/src/app/admin/_constants.ts
git commit -m "feat: refresh admin shell navigation"
```

### Task 4: Build the dashboard page

**Files:**
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/page.tsx`

- [ ] **Step 1: Write the failing test**

Use `lishop-frontend/tests/e2e/admin-dashboard.spec.ts` from Task 1.

- [ ] **Step 2: Run test to verify the dashboard requirement**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-dashboard.spec.ts`

Expected: FAIL before dashboard implementation, PASS once implemented.

- [ ] **Step 3: Write minimal implementation**

Render a dashboard with:
- dashboard hero
- KPI cards
- revenue trend chart
- status breakdown / top products
- low stock and attention panels
- quick links into operational admin routes

Use only `admin/stats` and `admin/analytics`.

- [ ] **Step 4: Run targeted verification**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-dashboard.spec.ts tests/e2e/admin-ai-analytics-insights.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lishop-frontend/apps/mfe-admin/src/app/admin/page.tsx lishop-frontend/tests/e2e/admin-dashboard.spec.ts
git commit -m "feat: add admin overview dashboard"
```

### Task 5: Uplift analytics and core operations pages

**Files:**
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/analytics/page.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/orders/page.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/products/page.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/inventory/page.tsx`

- [ ] **Step 1: Write the failing test**

Use current Playwright specs as behavior locks for analytics and products:
- `admin-ai-analytics-insights.spec.ts`
- `admin-ai-product-copy.spec.ts`
- `admin-ai-product-import-enrich.spec.ts`

- [ ] **Step 2: Run tests to verify baseline**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-ai-analytics-insights.spec.ts tests/e2e/admin-ai-product-copy.spec.ts tests/e2e/admin-ai-product-import-enrich.spec.ts`

Expected: PASS before visual uplift.

- [ ] **Step 3: Write minimal implementation**

Add page headers, visual summary strips, iconography, richer chart framing, and tasteful image/illustration tiles while preserving existing buttons, text hooks, and data-testid surfaces.

- [ ] **Step 4: Re-run focused verification**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-ai-analytics-insights.spec.ts tests/e2e/admin-ai-product-copy.spec.ts tests/e2e/admin-ai-product-import-enrich.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lishop-frontend/apps/mfe-admin/src/app/admin/analytics/page.tsx lishop-frontend/apps/mfe-admin/src/app/admin/orders/page.tsx lishop-frontend/apps/mfe-admin/src/app/admin/products/page.tsx lishop-frontend/apps/mfe-admin/src/app/admin/inventory/page.tsx
git commit -m "feat: enrich admin analytics and operations pages"
```

### Task 6: Uplift support, moderation, and after-sales pages

**Files:**
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/tickets/page.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/faq/page.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/reviews/page.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/returns/page.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/refunds/page.tsx`

- [ ] **Step 1: Write the failing test**

Use the existing e2e specs as regression coverage:
- `admin-ticket-ai-assist.spec.ts`
- `admin-review-ai-moderation.spec.ts`
- `admin-ai-returns-refunds.spec.ts`

- [ ] **Step 2: Run baseline verification**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-ticket-ai-assist.spec.ts tests/e2e/admin-review-ai-moderation.spec.ts tests/e2e/admin-ai-returns-refunds.spec.ts`

Expected: PASS before page uplift.

- [ ] **Step 3: Write minimal implementation**

Add richer page headers, page-level stat chips, icons, improved empty states, and illustration/image surfaces around support/moderation/after-sales tools without altering the current interactive flows.

- [ ] **Step 4: Re-run regression verification**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-ticket-ai-assist.spec.ts tests/e2e/admin-review-ai-moderation.spec.ts tests/e2e/admin-ai-returns-refunds.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lishop-frontend/apps/mfe-admin/src/app/admin/tickets/page.tsx lishop-frontend/apps/mfe-admin/src/app/admin/faq/page.tsx lishop-frontend/apps/mfe-admin/src/app/admin/reviews/page.tsx lishop-frontend/apps/mfe-admin/src/app/admin/returns/page.tsx lishop-frontend/apps/mfe-admin/src/app/admin/refunds/page.tsx
git commit -m "feat: polish admin support and after-sales pages"
```

### Task 7: Final verification and delivery commit

**Files:**
- Verify: `lishop-frontend/apps/mfe-admin/**`
- Verify: `lishop-frontend/tests/e2e/**`

- [ ] **Step 1: Run type-check**

Run: `pnpm --filter @lishop/mfe-admin type-check`

Expected: PASS

- [ ] **Step 2: Run app lint or workspace lint if available**

Run: `pnpm --dir lishop-frontend type-check`

Expected: PASS

- [ ] **Step 3: Run the full touched e2e suite**

Run: `pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-dashboard.spec.ts tests/e2e/admin-ai-analytics-insights.spec.ts tests/e2e/admin-ai-product-copy.spec.ts tests/e2e/admin-ai-product-import-enrich.spec.ts tests/e2e/admin-ticket-ai-assist.spec.ts tests/e2e/admin-review-ai-moderation.spec.ts tests/e2e/admin-ai-returns-refunds.spec.ts`

Expected: PASS

- [ ] **Step 4: Review changed files and stage implementation**

Run: `git status --short`

Expected: Only intended admin frontend and test changes are staged.

- [ ] **Step 5: Commit**

```bash
git add lishop-frontend/apps/mfe-admin lishop-frontend/tests/e2e/admin-dashboard.spec.ts
git commit -m "feat: refresh admin dashboard and visuals"
```


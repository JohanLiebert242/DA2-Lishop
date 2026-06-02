# Shell Commerce Engagement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved shell search, coupon notifications, high-value order coupon, homepage engagement sections, and news page.

**Architecture:** Keep the shell as the composition layer and reuse existing micro-frontend URLs. Add frontend-only engagement content in the shell, and keep coupon issuance in backend promotion/order services.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, NestJS, Prisma, Jest, pnpm via Corepack.

---

### Task 1: Shell Header Search And Coupon Bell

**Files:**
- Modify: `lishop-frontend/apps/shell/src/components/header.tsx`

- [ ] Replace the search link with a controlled form that redirects to `${MFE.catalog}/products?q=<term>`.
- [ ] Redesign the header into a two-row responsive commerce header with brand, nav, search, notification dropdown, cart, account, and admin shortcut.
- [ ] Add deterministic daily coupon items valued from 5,000 to 50,000 VND in the bell dropdown.
- [ ] Run `corepack pnpm --filter @lishop/shell type-check`.
- [ ] Commit with `feat: improve shell header search and notifications`.

### Task 2: Shell Homepage Sections

**Files:**
- Modify: `lishop-frontend/apps/shell/src/app/page.tsx`

- [ ] Update hero to use an image-backed commerce layout and larger counters.
- [ ] Add static customer review data and render a review section below commerce sections.
- [ ] Add newsletter subscription form with email validation and success state.
- [ ] Add latest-news cards linking to `/news`.
- [ ] Run `corepack pnpm --filter @lishop/shell type-check`.
- [ ] Commit with `feat: add shell homepage engagement sections`.

### Task 3: Shell News Page

**Files:**
- Create: `lishop-frontend/apps/shell/src/app/news/page.tsx`

- [ ] Create a shell news page listing the same latest-news entries with article summaries.
- [ ] Ensure each homepage news card navigates to `/news`.
- [ ] Run `corepack pnpm --filter @lishop/shell type-check`.
- [ ] Commit with `feat: add shell news page`.

### Task 4: High-Value Order Coupon

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/promotions/coupons.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/promotions/coupons.service.spec.ts`
- Modify: `lishop-backend/apps/api/src/modules/orders/orders.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/orders/orders.service.spec.ts`

- [ ] Add `issueHighValueOrderCoupon(userId, orderNumber)` to `CouponsService`.
- [ ] Generate an active 10% coupon with `maxUses: 1`, `expiresAt` in 30 days, and a unique code prefix such as `NEXT10`.
- [ ] In `OrdersService.placeOrder`, after order creation and coupon usage recording, issue this coupon when `totalVnd >= 30000000`.
- [ ] Create a `PROMOTIONS` notification containing the coupon code.
- [ ] Add Jest coverage for coupon creation and the high-value order path.
- [ ] Run `corepack pnpm --filter @lishop/api test -- orders.service.spec.ts coupons.service.spec.ts`.
- [ ] Commit with `feat: award coupon for high value orders`.

### Task 5: Runtime Verification

**Files:**
- No intentional source edits.

- [ ] Run shell type-check and backend focused tests.
- [ ] Open shell locally in Browser/Playwright and verify header, hero, reviews, newsletter, latest news, and `/news`.
- [ ] Verify search redirects to the catalog with `q`.
- [ ] If verification requires source fixes, apply them and commit the fix.


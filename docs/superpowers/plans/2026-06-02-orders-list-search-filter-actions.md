# Orders List Search Filter Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the customer orders page with search, status filtering, order actions, shop display, and delivered date display.

**Architecture:** Extend the existing orders repository response with shipment delivery data, then enhance `mfe-orders` client-side filtering and card UI. Keep seller/shop data static for this phase because the schema has no seller/shop relation on orders.

**Tech Stack:** NestJS, Prisma, Next.js 15, React 19, TanStack Query, Tailwind CSS.

---

### Task 1: Backend Order Delivered Date

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/orders/orders.repository.ts`
- Modify: `lishop-frontend/apps/mfe-orders/src/lib/orders-api.ts`

- [ ] Add `shipment: { deliveredAt: Date | null } | null` to `OrderWithDetails`.
- [ ] Include `shipment.deliveredAt` in `ORDER_INCLUDE`.
- [ ] Add `shipment` to frontend `OrderSummary`.
- [ ] Run `corepack pnpm --filter @lishop/api type-check` and `corepack pnpm --filter @lishop/mfe-orders type-check`.
- [ ] Commit as `feat: expose order delivered dates`.

### Task 2: Orders Page Search, Filter, Actions

**Files:**
- Modify: `lishop-frontend/apps/mfe-orders/src/app/orders/page.tsx`

- [ ] Add local state for search keyword and status filter.
- [ ] Derive filtered orders by order number and item product/variant names.
- [ ] Add status filter chips/select and search input above the list.
- [ ] Show `Lishop Official Store` on each order card.
- [ ] Show delivered date for `DELIVERED` orders when `order.shipment.deliveredAt` exists.
- [ ] Add action buttons: review, request refund, contact seller, buy again.
- [ ] Ensure buttons do not trigger the whole card navigation unexpectedly.
- [ ] Run `corepack pnpm --filter @lishop/mfe-orders type-check`.
- [ ] Commit as `feat: enhance customer orders list`.

### Task 3: Verification

**Files:**
- No source edits unless a verification issue is found.

- [ ] Run fresh API and orders MFE type-checks.
- [ ] If local server is healthy, open `/orders` and verify search/filter/actions render.
- [ ] Report any environment blocker clearly.

# Checkout Payment Simulation And Order Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace auto-success online payments with an explicit local payment simulator, fix the ZaloPay dead-end, and make COD / shipping / delivery transitions visible and operable through the existing order-management surfaces.

**Architecture:** Keep the existing backend payment and order modules, but route demo online payments through a checkout-hosted simulator page instead of direct mock success callbacks. Reuse existing admin order/payment controls for `PENDING -> PROCESSING -> SHIPPED`, and add a customer-confirmed `SHIPPED -> DELIVERED` endpoint so the order lifecycle has a complete, testable path.

**Tech Stack:** Next.js app router MFEs, NestJS modules/services/controllers, Prisma-backed repositories, Jest unit tests, Playwright E2E tests.

---

### Task 1: Lock Online Payment Simulation Behavior

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/payments/payments.gateway.ts`
- Modify: `lishop-backend/apps/api/src/modules/payments/payments.service.spec.ts`
- Test: `lishop-backend/apps/api/src/modules/payments/payments.service.spec.ts`

- [ ] Add failing test coverage for demo online methods returning a local simulator URL instead of an auto-success callback.
- [ ] Run the targeted payments service test to verify the new expectation fails for the right reason.
- [ ] Implement demo URL generation for `VNPAY`, `MOMO`, and `ZALOPAY`, preserving real gateway behavior when non-demo credentials are configured.
- [ ] Re-run the targeted payments service test and confirm it passes.

### Task 2: Make COD Confirmation Advance The Order

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/payments/payments.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/payments/payments.repository.ts`
- Modify: `lishop-backend/apps/api/src/modules/payments/payments.service.spec.ts`
- Test: `lishop-backend/apps/api/src/modules/payments/payments.service.spec.ts`

- [ ] Add a failing test showing admin COD confirmation must complete the payment and move the order to `PROCESSING`.
- [ ] Run the targeted payments service test to verify the failure.
- [ ] Implement the minimal payment-confirmation change, including any necessary transaction/repository update.
- [ ] Re-run the targeted payments service test and confirm it passes.

### Task 3: Add Customer Delivery Confirmation

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/orders/orders.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/orders/orders.repository.ts`
- Modify: `lishop-backend/apps/api/src/modules/orders/orders.controller.ts`
- Modify: `lishop-backend/apps/api/src/modules/orders/orders.service.spec.ts`
- Test: `lishop-backend/apps/api/src/modules/orders/orders.service.spec.ts`

- [ ] Add failing tests for `SHIPPED -> DELIVERED` customer confirmation and rejection of invalid states.
- [ ] Run the targeted orders service test and verify it fails as expected.
- [ ] Implement a user-authenticated confirm-delivery path that updates order/shipment state and preserves delivered-time semantics for invoices/returns/reviews.
- [ ] Re-run the targeted orders service test and confirm it passes.

### Task 4: Build The Shared Checkout Payment Simulator Page

**Files:**
- Create: `lishop-frontend/apps/mfe-checkout/src/app/checkout/payment-simulator/page.tsx`
- Modify: `lishop-frontend/apps/mfe-checkout/src/app/checkout/page.tsx`
- Modify: `lishop-frontend/apps/mfe-checkout/src/lib/checkout-api.ts`
- Modify: `lishop-frontend/tests/e2e/checkout.spec.ts`
- Test: `lishop-frontend/tests/e2e/checkout.spec.ts`

- [ ] Extend the checkout E2E spec with a failing expectation that online methods land on a simulator page with success/failure actions, including `ZALOPAY`.
- [ ] Run the targeted checkout E2E test to verify the simulator expectation fails.
- [ ] Implement the shared simulator page and wire checkout redirects to it.
- [ ] Re-run the targeted checkout E2E test and confirm it passes.

### Task 5: Surface The Remaining Lifecycle Actions In Orders UI

**Files:**
- Modify: `lishop-frontend/apps/mfe-orders/src/lib/orders-api.ts`
- Modify: `lishop-frontend/apps/mfe-orders/src/app/orders/[id]/page.tsx`
- Modify: `lishop-frontend/tests/e2e/orders-actions.spec.ts`
- Test: `lishop-frontend/tests/e2e/orders-actions.spec.ts`

- [ ] Add a failing orders E2E scenario for a shipped order where the customer can confirm receipt and see the order become delivered.
- [ ] Run the targeted orders E2E test and verify it fails for the right reason.
- [ ] Implement the minimal orders-page action, loading/error handling, and refresh behavior.
- [ ] Re-run the targeted orders E2E test and confirm it passes.

### Task 6: Make Admin Progression Paths Obvious

**Files:**
- Modify: `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/orders/page.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/payments/page.tsx`

- [ ] Add explicit admin actions or copy for `Xác nhận tiền mặt`, `Bàn giao vận chuyển`, and `Đã giao` on top of the existing generic status control.
- [ ] Keep the implementation minimal by reusing `/admin/payments/:orderId/confirm`, `/admin/orders/:id/status`, and `/admin/orders/:id/tracking`.
- [ ] Manually verify the admin UI still supports the old select flow while exposing the recommended operational path more clearly.

### Task 7: Verify End To End

**Files:**
- Test: `lishop-backend/apps/api/src/modules/payments/payments.service.spec.ts`
- Test: `lishop-backend/apps/api/src/modules/orders/orders.service.spec.ts`
- Test: `lishop-frontend/tests/e2e/checkout.spec.ts`
- Test: `lishop-frontend/tests/e2e/orders-actions.spec.ts`

- [ ] Run targeted backend unit tests for payments and orders.
- [ ] Run targeted Playwright tests for checkout and orders actions.
- [ ] Run `pnpm test` in `lishop-backend`.
- [ ] Run `pnpm test` in `lishop-frontend`.
- [ ] Run full Playwright in `lishop-frontend`.

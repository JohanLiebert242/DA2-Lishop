# Wallet Bank Transfer Topup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace instant wallet top-up with a bank-transfer request workflow and admin approval.

**Architecture:** Add a Prisma `WalletTopupRequest` model and status enum. User top-up creates a pending request with transfer instructions; admin approval credits wallet inside a transaction and creates the wallet transaction.

**Tech Stack:** NestJS, Prisma, Next.js 15, React 19, TanStack Query, Tailwind CSS.

---

### Task 1: Backend Model And APIs

**Files:**
- Modify: `lishop-backend/packages/database/prisma/schema.prisma`
- Create: `lishop-backend/packages/database/prisma/migrations/20260602133000_add_wallet_topup_requests/migration.sql`
- Modify: `lishop-backend/apps/api/src/modules/wallet/wallet.repository.ts`
- Modify: `lishop-backend/apps/api/src/modules/wallet/wallet.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/wallet/wallet.controller.ts`
- Modify: `lishop-backend/apps/api/src/modules/wallet/wallet.service.spec.ts`
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.controller.ts`

- [ ] Add `WalletTopupStatus` enum and `WalletTopupRequest` model.
- [ ] Update wallet service top-up to create pending request and not credit wallet.
- [ ] Add user endpoint for listing top-up requests.
- [ ] Add admin list/approve/reject endpoints.
- [ ] Update tests so `topUp()` does not call `repo.credit()`, and approval credits wallet once.
- [ ] Run Prisma generate, API tests, and type-check.
- [ ] Commit as `feat: add wallet topup request workflow`.

### Task 2: Customer Wallet UI

**Files:**
- Modify: `lishop-frontend/apps/mfe-profile/src/lib/wallet-api.ts`
- Modify: `lishop-frontend/apps/mfe-profile/src/app/wallet/page.tsx`

- [ ] Update top-up response types and add `getTopupRequests`.
- [ ] Change top-up form to show bank transfer instructions instead of success balance credit.
- [ ] Do not update wallet balance after creating a top-up request.
- [ ] Show pending/recent top-up requests.
- [ ] Run MFE profile type-check.
- [ ] Commit as `feat: show wallet bank transfer topups`.

### Task 3: Admin Topup Review UI

**Files:**
- Modify: `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/layout.tsx`
- Create: `lishop-frontend/apps/mfe-admin/src/app/admin/wallet-topups/page.tsx`

- [ ] Add admin API methods and types for top-up requests.
- [ ] Add sidebar link.
- [ ] Build admin list with approve/reject actions and admin note.
- [ ] Run MFE admin type-check.
- [ ] Commit as `feat: add admin wallet topup review`.

### Task 4: Final Verification

**Files:**
- No source edits unless verification finds issues.

- [ ] Run API, MFE profile, and MFE admin type-checks.
- [ ] Run focused wallet service tests.
- [ ] If local servers are healthy, verify wallet and admin pages render.

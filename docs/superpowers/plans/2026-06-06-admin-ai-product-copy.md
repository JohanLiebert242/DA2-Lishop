# Admin AI Product Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin AI helper that drafts product descriptions inside the product modal.

**Architecture:** Reuse the existing admin module for an authenticated `POST /admin/products/ai-copy` endpoint. The admin product modal calls this endpoint and writes the generated description into the existing textarea for admin review.

**Tech Stack:** NestJS, TypeScript, Next.js, React Query, Playwright, OpenAI Responses API via `fetch`.

---

### Task 1: Backend Product Copy API

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.service.spec.ts`
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/admin/dto/generate-product-copy.dto.ts`

- [ ] **Step 1: Write failing tests**

Add tests for OpenAI success, no-key fallback, and OpenAI failure fallback.

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --filter @lishop/api test -- admin.service.spec.ts`

Expected: failure because `generateProductCopy` does not exist.

- [ ] **Step 3: Implement endpoint and service**

Add DTO, controller route, prompt, OpenAI call, output extraction, and fallback copy.

- [ ] **Step 4: Verify GREEN**

Run:
- `corepack pnpm --filter @lishop/api test -- admin.service.spec.ts`
- `corepack pnpm --filter @lishop/api type-check`

Expected: both pass.

- [ ] **Step 5: Commit**

Run: `git add ... && git commit -m "feat: add admin AI product copy API"`

### Task 2: Admin Product Modal UI

**Files:**
- Modify: `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/products/page.tsx`

- [ ] **Step 1: Add API client method**

Add typed `generateProductCopy(input)` to `adminApi`.

- [ ] **Step 2: Add modal button behavior**

Add "AI viet mo ta" button near the description field, call the endpoint, and update description state with returned copy.

- [ ] **Step 3: Verify type-check**

Run: `corepack pnpm --filter @lishop/mfe-admin type-check`

Expected: pass.

- [ ] **Step 4: Commit**

Run: `git add ... && git commit -m "feat: add admin AI copy button"`

### Task 3: Playwright Coverage and Final Verification

**Files:**
- Create: `lishop-frontend/tests/e2e/admin-ai-product-copy.spec.ts`

- [ ] **Step 1: Add e2e**

Mock `/auth/me`, admin stats/products/categories, and `POST /admin/products/ai-copy`. Assert generated text appears in the description field.

- [ ] **Step 2: Run Playwright**

Run: `corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-ai-product-copy.spec.ts`

Expected: pass.

- [ ] **Step 3: Run final verification**

Run:
- `corepack pnpm --filter @lishop/api test`
- `corepack pnpm --filter @lishop/api type-check`
- `corepack pnpm --filter @lishop/mfe-admin type-check`
- `corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-ai-product-copy.spec.ts`

Expected: all pass.

- [ ] **Step 4: Commit**

Run: `git add ... && git commit -m "test: cover admin AI product copy"`

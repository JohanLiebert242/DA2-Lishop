# AI Review Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only AI assistant that suggests review moderation decisions without automatically changing review status.

**Architecture:** Backend adds a `ReviewsService.generateModerationAssist()` method and `POST /admin/reviews/:id/ai-moderation` route. Frontend admin reviews calls the endpoint per row and renders a compact recommendation panel. OpenAI is used when configured; deterministic fallback keeps the feature usable offline.

**Tech Stack:** NestJS, Jest, OpenAI Responses API through `fetch`, Next.js admin MFE, TanStack Query, Playwright.

---

## File Structure

- `lishop-backend/apps/api/src/modules/reviews/reviews.service.spec.ts`: service tests for OpenAI success, fallback, API failure, and missing review.
- `lishop-backend/apps/api/src/modules/reviews/reviews.service.ts`: AI moderation logic, prompt, parsing, fallback.
- `lishop-backend/apps/api/src/modules/admin/admin.controller.ts`: admin route for review AI moderation.
- `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts`: response type and API method.
- `lishop-frontend/apps/mfe-admin/src/app/admin/reviews/page.tsx`: button, mutation, and result panel.
- `lishop-frontend/tests/e2e/admin-review-ai-moderation.spec.ts`: Playwright coverage for the admin AI moderation flow.

### Task 1: Backend AI Moderation API

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/reviews/reviews.service.spec.ts`
- Modify: `lishop-backend/apps/api/src/modules/reviews/reviews.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.controller.ts`

- [ ] **Step 1: Write failing service tests**

Add tests that expect `generateModerationAssist(reviewId)` to exist and return structured moderation output for OpenAI success, missing API key fallback, OpenAI error fallback, and missing review.

- [ ] **Step 2: Run tests to verify RED**

Run: `corepack pnpm --filter @lishop/api test -- reviews.service.spec.ts`

Expected: fail because `generateModerationAssist` is not implemented and `ConfigService` is not injected.

- [ ] **Step 3: Implement minimal backend code**

Add `ReviewModerationAssist` type, `ConfigService` injection, OpenAI request, JSON parsing, fallback rules, and controller route.

- [ ] **Step 4: Run backend focused verification**

Run:

```powershell
corepack pnpm --filter @lishop/api test -- reviews.service.spec.ts
corepack pnpm --filter @lishop/api type-check
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit backend API**

```powershell
git add -- lishop-backend/apps/api/src/modules/reviews/reviews.service.spec.ts lishop-backend/apps/api/src/modules/reviews/reviews.service.ts lishop-backend/apps/api/src/modules/admin/admin.controller.ts
git commit -m "feat: add AI review moderation API"
```

### Task 2: Admin Review Moderation UI

**Files:**
- Modify: `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/reviews/page.tsx`

- [ ] **Step 1: Add frontend API type and method**

Add `ReviewAiModerationResponse` and `adminApi.generateReviewModeration(id)`.

- [ ] **Step 2: Add UI mutation and panel**

In `ReviewRow`, add local moderation state, a TanStack mutation, the `AI kiem duyet` button, and a result panel showing suggested status, risk level, summary, reasons, and fallback badge.

- [ ] **Step 3: Run frontend type-check**

Run: `corepack pnpm --filter @lishop/mfe-admin type-check`

Expected: command exits 0.

- [ ] **Step 4: Commit admin UI**

```powershell
git add -- lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts lishop-frontend/apps/mfe-admin/src/app/admin/reviews/page.tsx
git commit -m "feat: add admin review AI moderation UI"
```

### Task 3: Playwright E2E Coverage

**Files:**
- Create: `lishop-frontend/tests/e2e/admin-review-ai-moderation.spec.ts`

- [ ] **Step 1: Write e2e test**

Mock auth, admin stats, admin reviews, and `POST /admin/reviews/:id/ai-moderation`. Navigate to `/admin/reviews`, click `AI kiem duyet`, and assert the moderation panel appears.

- [ ] **Step 2: Run Playwright spec**

Run:

```powershell
$out = "test-results-review-ai-$(Get-Date -Format 'yyyyMMdd-HHmmss')"; corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-review-ai-moderation.spec.ts --output=$out
```

Expected: 1 test passes.

- [ ] **Step 3: Commit e2e test**

```powershell
git add -- lishop-frontend/tests/e2e/admin-review-ai-moderation.spec.ts
git commit -m "test: cover admin review AI moderation"
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
corepack pnpm --filter @lishop/mfe-admin type-check
```

Expected: both commands exit 0.

- [ ] **Step 3: Run Playwright e2e**

Run the review AI moderation Playwright command from Task 3 again.

Expected: 1 test passes.

- [ ] **Step 4: Inspect git status**

Run: `git status --short`

Expected: only unrelated runtime artifacts remain uncommitted.

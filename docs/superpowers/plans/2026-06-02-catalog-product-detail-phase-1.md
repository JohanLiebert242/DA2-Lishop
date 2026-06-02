# Catalog Product Detail Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve product listing filters, SKU/variant selection, product detail content, shop/share UX, and review filtering/media UI.

**Architecture:** Extend existing catalog query DTO/repository and keep product-detail enhancements in the MFE catalog client. Avoid database migrations for phase 1; derive brand and promotion state from existing product data.

**Tech Stack:** NestJS, Prisma, Next.js 15, React 19, TanStack Query, Tailwind CSS.

---

### Task 1: Product Listing Filters

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/products/dto/product-list-query.dto.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/products.repository.ts`
- Modify: `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`
- Modify: `lishop-frontend/apps/mfe-catalog/src/components/product-filters.tsx`
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/product-list-client.tsx`

- [ ] Add query params for brand, min rating, in stock, sale, and free shipping.
- [ ] Wire frontend filter controls into product query.
- [ ] Run catalog and API type-check/focused tests.
- [ ] Commit.

### Task 2: Product Detail Commerce UX

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/product-detail-client.tsx`

- [ ] Group variant attributes and allow independent attribute selection.
- [ ] Update SKU, price, stock based on the matching variant.
- [ ] Add size guide link and rich description sections.
- [ ] Add media sharing actions, like count, and shop info.
- [ ] Run catalog type-check.
- [ ] Commit.

### Task 3: Review Filtering And Media UI

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/product-detail-client.tsx`

- [ ] Add star filter chips for reviews.
- [ ] Add review media URL inputs and local file preview.
- [ ] Keep submit compatible with current text-only API.
- [ ] Run catalog type-check.
- [ ] Commit.

### Task 4: Runtime Verification

**Files:**
- No intentional source edits unless fixes are needed.

- [ ] Use Playwright to verify product list filters and product detail interactions.
- [ ] Run final type-checks.
- [ ] Commit any fixes.


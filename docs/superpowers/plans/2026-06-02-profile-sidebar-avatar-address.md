# Profile Sidebar Avatar Address Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group profile subpages in the sidebar, add avatar file upload, and require real geocoded addresses before saving.

**Architecture:** Keep changes in the `mfe-profile` frontend. Use existing profile and address APIs without schema changes; avatar upload stores a data URL in `avatarUrl`, and address verification uses browser-side Nominatim geocoding before sending the existing address fields.

**Tech Stack:** Next.js 15, React 19, TanStack Query, Tailwind CSS, OpenStreetMap Nominatim.

---

### Task 1: Sidebar Profile Group

**Files:**
- Modify: `lishop-frontend/apps/mfe-profile/src/components/account-sidebar.tsx`

- [ ] Replace the flat `NAV` list with top-level account links and nested profile links.
- [ ] Keep `orders` and `notifications` top-level.
- [ ] Render nested profile links indented under the "Trang cá nhân" parent.
- [ ] Treat `profile`, `addresses`, `wallet`, `wishlist`, and `support` as active within the parent group.
- [ ] Run `corepack pnpm --filter @lishop/mfe-profile type-check`.
- [ ] Commit as `feat: group profile sidebar links`.

### Task 2: Profile Avatar Upload

**Files:**
- Modify: `lishop-frontend/apps/mfe-profile/src/app/profile/page.tsx`

- [ ] Remove the visible role row.
- [ ] Replace avatar URL input with an image file input.
- [ ] Validate uploaded file type starts with `image/`.
- [ ] Reject uploaded files over 2 MB.
- [ ] Convert valid files to a data URL with `FileReader` and store it in `form.avatarUrl`.
- [ ] Keep preview and existing profile update API behavior.
- [ ] Run `corepack pnpm --filter @lishop/mfe-profile type-check`.
- [ ] Commit as `feat: support profile avatar upload`.

### Task 3: Geocoded Address Form

**Files:**
- Modify: `lishop-frontend/apps/mfe-profile/src/app/addresses/page.tsx`

- [ ] Add geocoding result types and helper functions for Nominatim.
- [ ] Add an address search input and "Tìm địa chỉ" button to `AddressForm`.
- [ ] Show selectable geocoding candidates.
- [ ] Fill `street`, `district`, and `city` after selecting a candidate.
- [ ] Show a map preview iframe for the selected candidate.
- [ ] Disable save until contact fields are filled and a geocoded candidate is selected.
- [ ] Reset selected candidate when users manually edit address fields.
- [ ] Run `corepack pnpm --filter @lishop/mfe-profile type-check`.
- [ ] Commit as `feat: require geocoded shipping addresses`.

### Task 4: Verification

**Files:**
- No source edits unless verification finds issues.

- [ ] Run `corepack pnpm --filter @lishop/mfe-profile type-check`.
- [ ] If profile MFE is available locally, open profile and address pages to verify render.
- [ ] Report runtime blockers clearly.

# Admin Dashboard Refresh Design

**Date:** 2026-06-07  
**Status:** Drafted for implementation approval

## 1. Goal

Refresh the `mfe-admin` experience so `/admin` becomes a true landing dashboard and the rest of the admin pages feel richer, more visual, and more suitable for demos/reporting, without breaking existing routes, data contracts, or Playwright test coverage.

## 2. Product Direction

The admin should feel like a bright, report-friendly control center:

- visual first, but still work-oriented
- colorful status accents instead of a flat monochrome UI
- dashboard-oriented information hierarchy
- charts, mini summaries, icons, and imagery that help scanning
- no route churn and no hidden workflow changes

The guiding tone is: "overview at a glance, details one click away."

## 3. Scope

### In scope

- Replace `/admin` redirect with a real dashboard page.
- Refresh the admin shell (`/admin/layout.tsx`) with:
  - richer header
  - more expressive sidebar
  - icon-based navigation
  - better active states and grouping
- Introduce a reusable visual language for admin pages:
  - page hero/header sections
  - metric cards
  - chart panels
  - colored badges and status chips
  - empty/loading states with icons or lightweight illustrations
- Improve visual variety across core admin pages including:
  - analytics
  - orders
  - products
  - inventory
  - tickets
  - faq
  - reviews
  - returns
  - refunds
- Add icons and selected decorative/admin-relevant image surfaces where they support scanning and reporting.
- Keep the existing API usage intact unless a small additive call is clearly necessary.
- Preserve existing e2e-visible controls and test ids used by admin specs.

### Out of scope

- Rewriting backend admin APIs
- Reorganizing route structure
- Replacing tables with radically different interaction models
- Introducing fragile visual dependencies that complicate test stability

## 4. UX Plan

### 4.1 `/admin` landing dashboard

`/admin` will become a dashboard page composed of:

1. Executive hero band
   - title, summary sentence, current operating snapshot
   - quick status chips for revenue, orders, customers, products
   - date range / reporting label

2. KPI grid
   - revenue
   - order count
   - users
   - products
   - optional operational cards such as low stock, open tickets, refund queue

3. Visual reporting row
   - revenue trend chart
   - order status distribution / operations mix
   - top products or category performance

4. Operations overview row
   - low stock panel
   - pending returns/refunds/support queue
   - quick links to the highest-priority admin modules

5. Activity/insight zone
   - compact "attention needed" list
   - optional visual illustration or branded promo/report tile for demo richness

### 4.2 Admin shell refresh

The shell should become a stable frame shared by all admin pages:

- left navigation with icons and stronger visual grouping
- brighter active state with color bar and background
- top header with:
  - brand
  - live stats snapshot
  - return-to-shell entry
  - compact environment/status area
- main content area with more generous spacing and layered surfaces

### 4.3 Admin page polish

Each important admin page should gain:

- a page header block with icon + title + short explanatory copy
- optional page-level summary cards
- improved section hierarchy for charts/forms/tables
- richer empty/loading states
- tasteful illustrations or image-backed surfaces where they add variety without obscuring content

The page structure stays recognizable so existing tests and user flows still work.

## 5. Visual System

### 5.1 Style direction

- light background with soft blue/indigo/emerald/coral accents
- dashboard cards at low radius, subtle shadows, crisp borders
- denser but organized SaaS layout
- charts visually prominent, not hidden as afterthoughts
- icons used consistently for navigation, sections, and KPI signaling

### 5.2 Assets

- use an icon library suited to React admin UI
- use lightweight, local visual surfaces for:
  - dashboard highlight tiles
  - empty states
  - section banners where appropriate

Images should support the admin/reporting context rather than look like marketing hero art.

## 6. Technical Design

### 6.1 Data strategy

Prefer composing the dashboard from existing admin calls:

- `admin/stats`
- `admin/analytics`

If needed, reuse existing module data already fetched on subpages rather than introducing broad backend changes.

### 6.2 Component strategy

Create small reusable admin UI helpers in `mfe-admin` for:

- page headers
- metric cards
- chart panels
- status badges
- empty states
- quick action tiles

These helpers should be presentation-focused and avoid changing business logic.

### 6.3 Routing

- `/admin` should render the dashboard instead of redirecting to `/admin/orders`.
- all current admin sub-routes remain unchanged.

### 6.4 Test compatibility

Preserve the following:

- route paths used by Playwright specs
- data-testid selectors already targeted by tests
- primary actions and button semantics on analytics, products, tickets, reviews, returns, and refunds pages
- auth guard behavior in `admin/layout.tsx`

The redesign should wrap existing behavior in a stronger visual frame rather than rewrite interactive contracts.

## 7. Testing Plan

1. Add or update targeted tests for `/admin` dashboard behavior.
2. Run type-check/lint for the frontend workspace or affected app.
3. Run targeted Playwright admin specs first.
4. Run broader e2e coverage relevant to the touched surfaces.
5. Fix any selector/layout regressions without weakening the tests.

## 8. Risks and Mitigations

### Risk: Visual refresh breaks Playwright assumptions

Mitigation:
- keep route paths, test ids, and control labels stable
- prefer additive wrappers around existing controls

### Risk: Charts or visuals make pages too heavy

Mitigation:
- reuse current chart tooling
- keep visuals static/lightweight where possible

### Risk: Admin pages become inconsistent after partial refresh

Mitigation:
- define a shared admin visual vocabulary first, then apply it page by page

## 9. Recommended Implementation Order

1. Shared shell and reusable admin UI primitives
2. `/admin` dashboard page
3. analytics page uplift
4. high-traffic operational pages: orders, products, inventory
5. support/review/refund/return pages
6. final polish and e2e stabilization


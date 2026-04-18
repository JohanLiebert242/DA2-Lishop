# Product Page Features — Design Spec

**Date:** 2026-04-18  
**Project:** Lishop (Vietnamese e-commerce platform)  
**Scope:** Missing features for a complete basic product page experience  
**Approach:** Feature clusters (C) — each cluster delivered end-to-end

---

## Context

The existing product pages (`mfe-catalog`) have a solid foundation:
- Product listing with search, sort, category filter, cursor pagination
- Product detail page with image gallery, rating, reviews, add-to-cart
- Reviews with verified purchase badges

Missing features identified through codebase analysis are grouped into 3 clusters below.

---

## Cluster 1: Detail Page Polish (frontend-only)

All changes are confined to `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx` and its supporting components. No backend changes.

### 1.1 Quantity Selector

A `−` / input / `+` control rendered above the "Add to Cart" button.

- Min = 1, Max = `product.stock`
- Decrement button disabled at qty=1; increment disabled at qty=stock
- `addToCart(productId, quantity)` passes the selected quantity
- Entire control disabled when `product.stock === 0`

### 1.2 Low-Stock Warning

Condition: `product.stock > 0 && product.stock <= 10`

- Render an amber badge directly below the price: `"Only {stock} left in stock"`
- No backend changes — stock is already returned by `GET /products/:slug`

### 1.3 Image Hover Zoom

- CSS `transform: scale(1.35)` with `transition: transform 300ms ease` on the main image
- Main image container has `overflow-hidden`
- No library, no modal — pure CSS
- Thumbnails unchanged

### 1.4 Star Distribution Chart

Rendered in the reviews section, below the average rating display.

- Five horizontal bars: 5★ → 1★
- Each bar's fill % = (count of reviews at that rating / total reviews) × 100
- Data computed client-side from the reviews array already fetched
- No new backend endpoint needed

### 1.5 Review Sorting

A dropdown above the review list with options: "Newest", "Highest rated", "Lowest rated".

- Sorts the already-fetched reviews array client-side
- No backend change — up to 20 reviews already loaded
- Default sort: "Newest"

---

## Cluster 2: Related Products

### 2.1 Backend — New Endpoint

`GET /products/:slug/related` (public, no auth)

**Repository method:** `findRelated(productId: string, categoryId: string, tagIds: string[], limit = 6)`

Logic:
1. `findMany` where `categoryId` matches + `id != productId` + `stock > 0`
2. Include each product's `tags` for overlap scoring
3. In-memory rank: sort descending by count of shared `tagIds`, tiebreak by `createdAt desc`
4. Return top `limit` results

**Response shape:** same as `ProductSummary` (id, name, slug, priceVnd, averageRating, reviewCount, primaryImage url)

No new DB migration needed.

**Controller addition** in `products.controller.ts`:
```
@Get(':slug/related')
@Public()
findRelated(@Param('slug') slug: string) { ... }
```

Service fetches product by slug first (to get productId, categoryId, tagIds), then calls `findRelated`.

### 2.2 Frontend — RelatedProducts Component

New component: `mfe-catalog/src/components/related-products.tsx`

- Fetches `GET /products/{slug}/related` via TanStack Query
- Renders a horizontal row of up to 6 `ProductCard` tiles (reuse existing component)
- Skeleton loader while fetching (4 gray placeholder cards)
- Hidden entirely if response is empty
- Rendered at the bottom of `app/products/[slug]/page.tsx`, below the reviews section

---

## Cluster 3: Wishlist

### 3.1 Database

New model added to `schema.prisma`:

```prisma
model Wishlist {
  id        String   @id @default(uuid())
  userId    String
  productId String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
}
```

Requires:
- `User` model gets `wishlist Wishlist[]` relation
- `Product` model gets `wishlist Wishlist[]` relation
- One new migration: `db:migrate`
- `db:generate` to regenerate Prisma client

### 3.2 Backend — WishlistModule

Standard three-layer pattern: `wishlist.repository.ts` → `wishlist.service.ts` → `wishlist.controller.ts` → `wishlist.module.ts`

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /wishlist | Required | Returns `{ productIds: string[] }` for current user (used by heart icons) |
| GET | /wishlist/products | Required | Returns full `ProductSummary[]` for wishlisted products (used by wishlist page) |
| POST | /wishlist/:productId | Required | Add product; 409 if already wishlisted |
| DELETE | /wishlist/:productId | Required | Remove product; 404 if not found |

**Repository methods:**
- `findIdsByUserId(userId)` → `string[]` (productIds only — for heart icon check)
- `findProductsByUserId(userId)` → `ProductSummary[]` (full join — for wishlist page)
- `create(userId, productId)` → `Wishlist`
- `delete(userId, productId)` → `Wishlist`
- `exists(userId, productId)` → `boolean`

**Service behavior:**
- `POST`: call `exists()` first; throw `ConflictException` if true
- `DELETE`: call `exists()` first; throw `NotFoundException` if false
- `GET /wishlist`: returns `{ productIds: string[] }` (minimal payload for O(1) heart checks)
- `GET /wishlist/products`: returns `ProductSummary[]` via single Prisma join query (no N+1)

`WishlistModule` imports `AuthModule` (already global, so no extra import needed).

### 3.3 Frontend — Heart Icons

**Shared API client** per MFE:

`mfe-catalog/src/lib/wishlist-api.ts`:
- `getWishlist(): Promise<string[]>` — GET /wishlist → returns productIds array
- `addToWishlist(productId): Promise<void>` — POST /wishlist/:productId
- `removeFromWishlist(productId): Promise<void>` — DELETE /wishlist/:productId

**TanStack Query hooks** (inline in components):
- `useQuery(['wishlist'])` — fetches wishlist on mount; returns `Set<string>` for O(1) lookup
- `useMutation` for add/remove — `onSuccess: () => queryClient.invalidateQueries(['wishlist'])`

**Auth guard:** If user clicks heart while not logged in → redirect to `http://localhost:3001/login`

**3 integration points:**

1. **`ProductCard` component** (`mfe-catalog/src/components/product-card.tsx`)
   - Heart icon (outline/filled) top-right corner of card image
   - Filled (red) if `wishlistSet.has(product.id)`, outline if not
   - Click: toggle add/remove mutation; stopPropagation to prevent card navigation
   - Heart icon not rendered during wishlist loading (avoids flicker)

2. **Product detail page** (`app/products/[slug]/page.tsx`)
   - Heart button next to "Add to Cart"
   - Same filled/outline toggle behavior
   - Label: "Save" / "Saved"

3. **Wishlist page** (`mfe-profile/src/app/wishlist/page.tsx`) — new page
   - Grid of wishlisted products (fetches `GET /wishlist/products` — single request, full details)
   - Each card has a "Remove" button
   - Empty state: "Your wishlist is empty. Start browsing →"
   - Navigation: add "Wishlist" link to the account sidebar in mfe-profile

---

## Data Flow Summary

```
User clicks ♡ on ProductCard
  → useMutation(addToWishlist/removeFromWishlist)
  → POST/DELETE /wishlist/:productId (backend)
  → onSuccess: invalidateQueries(['wishlist'])
  → useQuery(['wishlist']) refetches → UI updates
```

```
GET /products/:slug/related
  → ProductsService.findRelated(slug)
  → ProductsRepository.findRelated(productId, categoryId, tagIds)
  → in-memory tag-overlap sort
  → returns ProductSummary[]
  → RelatedProducts component renders ProductCards
```

---

## File Change Summary

### Backend (lishop-backend)
- `packages/database/prisma/schema.prisma` — add Wishlist model + relations
- `apps/api/src/modules/products/products.repository.ts` — add `findRelated()`
- `apps/api/src/modules/products/products.service.ts` — add `findRelated()`
- `apps/api/src/modules/products/products.controller.ts` — add `GET /:slug/related`
- `apps/api/src/modules/wishlist/` — new module (4 files)
- `apps/api/src/app.module.ts` — import WishlistModule

### Frontend (lishop-frontend)
- `apps/mfe-catalog/src/app/products/[slug]/page.tsx` — quantity selector, low-stock, hover zoom, star chart, review sort, related products section, heart button
- `apps/mfe-catalog/src/components/product-card.tsx` — heart icon overlay
- `apps/mfe-catalog/src/components/related-products.tsx` — new component
- `apps/mfe-catalog/src/lib/wishlist-api.ts` — new API client
- `apps/mfe-profile/src/app/wishlist/page.tsx` — new wishlist page
- `apps/mfe-profile/src/lib/wishlist-api.ts` — new API client
- `apps/mfe-profile/src/components/account-sidebar.tsx` — add Wishlist nav link

---

## Out of Scope

- Product variants/SKUs (color, size) — requires schema redesign
- Review images/video uploads — requires file storage
- AI-based recommendations — no ML infrastructure
- Currency selector UI
- Admin product import/bulk upload

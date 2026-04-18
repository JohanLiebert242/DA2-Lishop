# Product Page Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add quantity selector, low-stock warning, image hover zoom, star distribution chart, review sorting, related products, and wishlist to the Lishop product pages.

**Architecture:** Three clusters delivered end-to-end — Cluster 1 is frontend-only polish on the detail page; Cluster 2 adds a `GET /products/:slug/related` endpoint plus a RelatedProducts component; Cluster 3 adds a full Wishlist backend module (DB migration + NestJS CRUD) and heart icons across mfe-catalog and a wishlist page in mfe-profile.

**Tech Stack:** NestJS 10 + Prisma 5 (backend), Next.js 15 App Router + TanStack Query v5 + Tailwind CSS v4 (frontend), PostgreSQL via Docker on port 5439.

---

## File Structure

### Backend (`lishop-backend/`)
| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `packages/database/prisma/schema.prisma` | Add Wishlist model + User/Product relations |
| Modify | `apps/api/src/modules/products/products.repository.ts` | Update `ProductWithDetails` type; add `findRelated()` |
| Modify | `apps/api/src/modules/products/products.service.ts` | Add `findRelated()` |
| Modify | `apps/api/src/modules/products/products.service.spec.ts` | Add `findRelated` tests |
| Modify | `apps/api/src/modules/products/products.controller.ts` | Add `GET /:slug/related` |
| Create | `apps/api/src/modules/wishlist/wishlist.repository.ts` | Prisma queries for wishlist |
| Create | `apps/api/src/modules/wishlist/wishlist.service.ts` | Business logic |
| Create | `apps/api/src/modules/wishlist/wishlist.service.spec.ts` | Unit tests |
| Create | `apps/api/src/modules/wishlist/wishlist.controller.ts` | HTTP endpoints |
| Create | `apps/api/src/modules/wishlist/wishlist.module.ts` | NestJS wiring |
| Modify | `apps/api/src/app.module.ts` | Import WishlistModule |

### Frontend (`lishop-frontend/`)
| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `apps/mfe-catalog/src/lib/catalog-api.ts` | Add `getRelatedProducts()` |
| Create | `apps/mfe-catalog/src/lib/wishlist-api.ts` | Wishlist API calls |
| Modify | `apps/mfe-catalog/src/components/product-card.tsx` | Add heart icon |
| Create | `apps/mfe-catalog/src/components/related-products.tsx` | Related products row |
| Modify | `apps/mfe-catalog/src/app/products/[slug]/page.tsx` | All Cluster 1+2+3 detail page changes |
| Create | `apps/mfe-profile/src/lib/wishlist-api.ts` | Wishlist API calls (profile MFE) |
| Create | `apps/mfe-profile/src/app/wishlist/page.tsx` | Wishlist page |
| Modify | `apps/mfe-profile/src/components/account-sidebar.tsx` | Add Wishlist nav link |

---

## Task 1: DB Migration — Add Wishlist Model

**Files:**
- Modify: `lishop-backend/packages/database/prisma/schema.prisma`

- [ ] **Step 1: Add Wishlist model and relations to schema.prisma**

In `schema.prisma`, add `wishlist Wishlist[]` to the `User` model (after the `couponUsages` line):
```prisma
  couponUsages        CouponUsage[]
  wishlist            Wishlist[]
```

Add `wishlist Wishlist[]` to the `Product` model (after the `flashSaleItems` line):
```prisma
  flashSaleItems FlashSaleItem[]
  wishlist       Wishlist[]
```

Append the new model at the end of the file:
```prisma
model Wishlist {
  id        String   @id @default(uuid())
  userId    String
  productId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
  @@index([userId])
}
```

- [ ] **Step 2: Run migration**

```bash
cd lishop-backend
pnpm --filter @lishop/database db:migrate
```

When prompted for a migration name, enter: `add_wishlist`

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm --filter @lishop/database db:generate
```

Expected output: `Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
cd lishop-backend
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "feat: add Wishlist model to prisma schema"
```

---

## Task 2: Backend — Related Products Endpoint

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/products/products.repository.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/products.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/products.service.spec.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/products.controller.ts`

- [ ] **Step 1: Write the failing tests**

Add these two tests inside the `describe('ProductsService')` block in `products.service.spec.ts`:

First, add `findRelated: jest.fn()` to the `repo` mock object:
```typescript
const repo = {
  findMany: jest.fn(),
  findBySlug: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findFeatured: jest.fn(),
  findRelated: jest.fn(),   // ADD THIS
};
```

Then add the new mockProduct with tags that include `tagId`:
```typescript
const mockProduct = {
  id: 'p1',
  name: 'iPhone 15',
  slug: 'iphone-15',
  description: 'Great phone',
  priceVnd: 20000000,
  priceUsd: 800,
  stock: 10,
  categoryId: 'c1',
  averageRating: 4.5,
  reviewCount: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
  tags: [{ tagId: 't1', tag: { name: 'smartphone' } }],
  category: { id: 'c1', name: 'Electronics', slug: 'electronics' },
};
```

Then add the test cases after the existing ones:
```typescript
  it('findRelated returns products ranked by tag overlap', async () => {
    repo.findBySlug.mockResolvedValue(mockProduct);
    const related = [{ ...mockProduct, id: 'p2', name: 'Samsung S24', slug: 'samsung-s24' }];
    repo.findRelated.mockResolvedValue(related);
    const result = await service.findRelated('iphone-15');
    expect(repo.findRelated).toHaveBeenCalledWith('p1', 'c1', ['t1'], 6);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Samsung S24');
  });

  it('findRelated throws NotFoundException for unknown slug', async () => {
    repo.findBySlug.mockResolvedValue(null);
    await expect(service.findRelated('unknown')).rejects.toThrow(NotFoundException);
    expect(repo.findRelated).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd lishop-backend
pnpm --filter @lishop/api test -- --testPathPattern=products.service.spec --no-coverage
```

Expected: `● ProductsService › findRelated returns products ranked by tag overlap` — FAIL with `service.findRelated is not a function`

- [ ] **Step 3: Update `ProductWithDetails` type and add `findRelated` to repository**

In `products.repository.ts`, update the `ProductWithDetails` interface (change `tags` line):
```typescript
export interface ProductWithDetails extends Product {
  images: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
  tags: { tagId: string; tag: { name: string } }[];
  category: { id: string; name: string; slug: string };
}
```

Then add this method at the end of the `ProductsRepository` class (before the closing `}`):
```typescript
  async findRelated(
    productId: string,
    categoryId: string,
    tagIds: string[],
    limit = 6,
  ): Promise<ProductWithDetails[]> {
    const candidates = await prisma.product.findMany({
      where: { categoryId, id: { not: productId }, stock: { gt: 0 } },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
        tags: { include: { tag: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (tagIds.length === 0) return candidates.slice(0, limit) as ProductWithDetails[];

    const tagIdSet = new Set(tagIds);
    return candidates
      .sort((a, b) => {
        const aOverlap = a.tags.filter((pt) => tagIdSet.has(pt.tagId)).length;
        const bOverlap = b.tags.filter((pt) => tagIdSet.has(pt.tagId)).length;
        return bOverlap - aOverlap;
      })
      .slice(0, limit) as ProductWithDetails[];
  }
```

- [ ] **Step 4: Add `findRelated` to service**

In `products.service.ts`, add this method after `findFeatured`:
```typescript
  async findRelated(slug: string, limit = 6): Promise<ProductWithDetails[]> {
    const product = await this.repo.findBySlug(slug);
    if (!product) throw new NotFoundException(`Product not found: ${slug}`);
    const tagIds = product.tags.map((pt) => pt.tagId);
    return this.repo.findRelated(product.id, product.categoryId, tagIds, limit);
  }
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=products.service.spec --no-coverage
```

Expected: All tests PASS including the two new `findRelated` tests.

- [ ] **Step 6: Add route to controller**

In `products.controller.ts`, add this method **before** the existing `@Get(':slug')` handler (order matters — NestJS matches routes top-to-bottom):
```typescript
  @Public()
  @Get(':slug/related')
  @ApiOperation({ summary: 'Get related products by category and tag overlap' })
  async findRelated(@Param('slug') slug: string) {
    return this.productsService.findRelated(slug);
  }
```

- [ ] **Step 7: Verify endpoint manually**

Make sure the backend is running (`pnpm dev` in `lishop-backend`), then:
```bash
curl -s "http://localhost:4000/products/dac-nhan-tam-dale-carnegie/related" | head -c 300
```

Expected: JSON with `data` array of product objects.

- [ ] **Step 8: Commit**

```bash
cd lishop-backend
git add apps/api/src/modules/products/
git commit -m "feat: add GET /products/:slug/related endpoint with tag-overlap ranking"
```

---

## Task 3: Backend — WishlistModule

**Files:**
- Create: `apps/api/src/modules/wishlist/wishlist.repository.ts`
- Create: `apps/api/src/modules/wishlist/wishlist.service.ts`
- Create: `apps/api/src/modules/wishlist/wishlist.service.spec.ts`
- Create: `apps/api/src/modules/wishlist/wishlist.controller.ts`
- Create: `apps/api/src/modules/wishlist/wishlist.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/wishlist/wishlist.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistRepository } from './wishlist.repository';

describe('WishlistService', () => {
  let service: WishlistService;
  const repo = {
    findIdsByUserId: jest.fn(),
    findProductsByUserId: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: WishlistRepository, useValue: repo },
      ],
    }).compile();
    service = module.get(WishlistService);
  });

  afterEach(() => jest.resetAllMocks());

  describe('getWishlistIds', () => {
    it('returns productIds array', async () => {
      repo.findIdsByUserId.mockResolvedValue(['p1', 'p2']);
      const result = await service.getWishlistIds('u1');
      expect(result).toEqual({ productIds: ['p1', 'p2'] });
    });
  });

  describe('add', () => {
    it('creates item when not already wishlisted', async () => {
      repo.exists.mockResolvedValue(false);
      repo.create.mockResolvedValue({ id: 'w1', userId: 'u1', productId: 'p1', createdAt: new Date() });
      await service.add('u1', 'p1');
      expect(repo.create).toHaveBeenCalledWith('u1', 'p1');
    });

    it('throws ConflictException when already wishlisted', async () => {
      repo.exists.mockResolvedValue(true);
      await expect(service.add('u1', 'p1')).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes item when in wishlist', async () => {
      repo.exists.mockResolvedValue(true);
      repo.delete.mockResolvedValue({ id: 'w1', userId: 'u1', productId: 'p1', createdAt: new Date() });
      await service.remove('u1', 'p1');
      expect(repo.delete).toHaveBeenCalledWith('u1', 'p1');
    });

    it('throws NotFoundException when not in wishlist', async () => {
      repo.exists.mockResolvedValue(false);
      await expect(service.remove('u1', 'p1')).rejects.toThrow(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd lishop-backend
pnpm --filter @lishop/api test -- --testPathPattern=wishlist.service.spec --no-coverage
```

Expected: FAIL — `Cannot find module './wishlist.service'`

- [ ] **Step 3: Create wishlist.repository.ts**

Create `apps/api/src/modules/wishlist/wishlist.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma } from '@lishop/database';

@Injectable()
export class WishlistRepository {
  async findIdsByUserId(userId: string): Promise<string[]> {
    const items = await prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });
    return items.map((item) => item.productId);
  }

  async findProductsByUserId(userId: string) {
    const items = await prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: true,
            tags: { include: { tag: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    return items.map((item) => item.product);
  }

  async exists(userId: string, productId: string): Promise<boolean> {
    const item = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return !!item;
  }

  async create(userId: string, productId: string) {
    return prisma.wishlist.create({ data: { userId, productId } });
  }

  async delete(userId: string, productId: string) {
    return prisma.wishlist.delete({
      where: { userId_productId: { userId, productId } },
    });
  }
}
```

- [ ] **Step 4: Create wishlist.service.ts**

Create `apps/api/src/modules/wishlist/wishlist.service.ts`:
```typescript
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { WishlistRepository } from './wishlist.repository';

@Injectable()
export class WishlistService {
  constructor(private readonly repo: WishlistRepository) {}

  async getWishlistIds(userId: string): Promise<{ productIds: string[] }> {
    const productIds = await this.repo.findIdsByUserId(userId);
    return { productIds };
  }

  async getWishlistProducts(userId: string) {
    return this.repo.findProductsByUserId(userId);
  }

  async add(userId: string, productId: string): Promise<void> {
    const exists = await this.repo.exists(userId, productId);
    if (exists) throw new ConflictException('Product already in wishlist');
    await this.repo.create(userId, productId);
  }

  async remove(userId: string, productId: string): Promise<void> {
    const exists = await this.repo.exists(userId, productId);
    if (!exists) throw new NotFoundException('Product not in wishlist');
    await this.repo.delete(userId, productId);
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=wishlist.service.spec --no-coverage
```

Expected: 4 tests PASS.

- [ ] **Step 6: Create wishlist.controller.ts**

Create `apps/api/src/modules/wishlist/wishlist.controller.ts`:
```typescript
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async getIds(@CurrentUser('id') userId: string) {
    return this.wishlistService.getWishlistIds(userId);
  }

  @Get('products')
  async getProducts(@CurrentUser('id') userId: string) {
    return this.wishlistService.getWishlistProducts(userId);
  }

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  async add(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    await this.wishlistService.add(userId, productId);
    return { message: 'Added to wishlist' };
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    await this.wishlistService.remove(userId, productId);
  }
}
```

- [ ] **Step 7: Create wishlist.module.ts**

Create `apps/api/src/modules/wishlist/wishlist.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { WishlistRepository } from './wishlist.repository';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';

@Module({
  providers: [WishlistRepository, WishlistService],
  controllers: [WishlistController],
})
export class WishlistModule {}
```

- [ ] **Step 8: Import WishlistModule in app.module.ts**

In `apps/api/src/app.module.ts`, add the import at the top:
```typescript
import { WishlistModule } from './modules/wishlist/wishlist.module';
```

Then add `WishlistModule` to the `imports` array (after `NotificationsModule`):
```typescript
    NotificationsModule,
    WishlistModule,
```

- [ ] **Step 9: Verify endpoints manually**

First, get a token by logging in:
```bash
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nguyen@lishop.vn","password":"Customer@123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/wishlist
```

Expected: `{"data":{"productIds":[]}}`

- [ ] **Step 10: Commit**

```bash
cd lishop-backend
git add apps/api/src/modules/wishlist/ apps/api/src/app.module.ts
git commit -m "feat: add WishlistModule with GET/POST/DELETE endpoints"
```

---

## Task 4: Frontend — Detail Page Polish (Cluster 1)

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx`

All changes are in the existing product detail page. The file stays a single `'use client'` component.

- [ ] **Step 1: Add quantity selector state and update handleAddToCart**

At the top of the `ProductDetailPage` function body (after the existing `useState` declarations), add:
```typescript
  const [qty, setQty] = useState(1);
```

Update `handleAddToCart` to pass `qty`:
```typescript
  async function handleAddToCart() {
    if (!product) return;
    setAddingToCart(true);
    setCartMessage('');
    try {
      await addToCart(product.id, qty);
      setCartMessage('Đã thêm vào giỏ hàng!');
      setTimeout(() => setCartMessage(''), 3000);
    } catch (err: unknown) {
      setCartMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setAddingToCart(false);
    }
  }
```

- [ ] **Step 2: Add quantity selector UI**

Replace the `<div className="mt-6">` block that contains the Add to Cart button with:
```tsx
          {/* Quantity selector */}
          {product.stock > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Số lượng:</span>
              <div className="flex items-center rounded-md border border-gray-300">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="flex h-9 w-9 items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  −
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="w-12 border-x border-gray-300 py-1.5 text-center text-sm font-semibold focus:outline-none"
                  min={1}
                  max={product.stock}
                />
                <button
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  disabled={qty >= product.stock}
                  className="flex h-9 w-9 items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="mt-4">
            <button
              disabled={product.stock === 0 || addingToCart}
              onClick={handleAddToCart}
              className="w-full rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingToCart ? 'Đang thêm...' : product.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
            </button>
            {cartMessage && (
              <p className={`mt-2 text-center text-sm ${cartMessage.includes('Đã') ? 'text-green-600' : 'text-red-600'}`}>
                {cartMessage}
              </p>
            )}
          </div>
```

- [ ] **Step 3: Add low-stock warning**

Directly after the stock status `<div className="mt-2">` block, add:
```tsx
          {product.stock > 0 && product.stock <= 10 && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              ⚠️ Chỉ còn {product.stock} sản phẩm
            </div>
          )}
```

- [ ] **Step 4: Add hover zoom to main image**

In the main image `<div>`, find the `<Image>` component inside the aspect-square container and add the zoom class to its `className`:
```tsx
              <Image
                src={currentImage.url}
                alt={currentImage.alt ?? product.name}
                fill
                className="object-cover transition-transform duration-300 hover:scale-[1.35] cursor-zoom-in"
                priority
              />
```

The parent container already has `overflow-hidden`, so the scaled image is clipped correctly.

- [ ] **Step 5: Add star distribution chart and review sort to ReviewsSection**

At the top of the `ReviewsSection` function body, add sort state after existing state declarations:
```typescript
  const [sortOrder, setSortOrder] = useState<'newest' | 'highest' | 'lowest'>('newest');
```

After the `avgRating` calculation, add:
```typescript
  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length > 0
      ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100
      : 0,
  }));

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOrder === 'highest') return b.rating - a.rating;
    if (sortOrder === 'lowest') return a.rating - b.rating;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
```

In the JSX, after the existing average rating display and before the "Viết đánh giá" button row, add the star chart:
```tsx
          {reviews.length > 0 && (
            <div className="mt-3 w-48 space-y-1">
              {starCounts.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right text-gray-500">{star}</span>
                  <span className="text-yellow-400">★</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-yellow-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-4 text-right text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          )}
```

Add the sort dropdown above the review list (after the `showForm` block and before the empty-state check):
```tsx
      {reviews.length > 1 && (
        <div className="mb-3 flex justify-end">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 focus:outline-none"
          >
            <option value="newest">Mới nhất</option>
            <option value="highest">Đánh giá cao nhất</option>
            <option value="lowest">Đánh giá thấp nhất</option>
          </select>
        </div>
      )}
```

Replace `{reviews.map((review: ReviewInfo) => (` with `{sortedReviews.map((review: ReviewInfo) => (` in the review list render.

- [ ] **Step 6: Test in browser**

Navigate to `http://localhost:3002/products/dac-nhan-tam-dale-carnegie` (or any product slug).

Verify:
- `−` / number / `+` quantity control appears when in stock
- Amber "Chỉ còn X sản phẩm" badge appears for products with stock ≤ 10
- Hovering over the main image zooms it
- Star bars appear in the review section
- Sort dropdown re-orders reviews

- [ ] **Step 7: Commit**

```bash
cd lishop-frontend
git add apps/mfe-catalog/src/app/products/
git commit -m "feat: add quantity selector, low-stock warning, hover zoom, star chart, review sort"
```

---

## Task 5: Frontend — Related Products (Cluster 2)

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`
- Create: `lishop-frontend/apps/mfe-catalog/src/components/related-products.tsx`
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx`

- [ ] **Step 1: Add `getRelatedProducts` to catalog-api.ts**

In `catalog-api.ts`, add this to the `catalogApi` object (after `getFeatured`):
```typescript
  getRelatedProducts: (slug: string) =>
    apiFetch<ProductSummary[]>(`/products/${slug}/related`),
```

- [ ] **Step 2: Create related-products.tsx**

Create `apps/mfe-catalog/src/components/related-products.tsx`:
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../lib/catalog-api';
import { ProductCard } from './product-card';

export function RelatedProducts({ slug }: { slug: string }) {
  const { data: related = [], isLoading } = useQuery({
    queryKey: ['related', slug],
    queryFn: () => catalogApi.getRelatedProducts(slug),
  });

  if (isLoading) {
    return (
      <div className="mt-12 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Sản phẩm liên quan</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (related.length === 0) return null;

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">Sản phẩm liên quan</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire RelatedProducts into product detail page**

In `apps/mfe-catalog/src/app/products/[slug]/page.tsx`, add the import at the top:
```typescript
import { RelatedProducts } from '../../../components/related-products';
```

At the very end of the returned JSX (after `<ReviewsSection productId={product.id} />`), add:
```tsx
      <RelatedProducts slug={slug} />
```

- [ ] **Step 4: Test in browser**

Navigate to a product detail page. Scroll to the bottom — a "Sản phẩm liên quan" section should appear with up to 6 product cards from the same category.

- [ ] **Step 5: Commit**

```bash
cd lishop-frontend
git add apps/mfe-catalog/src/lib/catalog-api.ts apps/mfe-catalog/src/components/related-products.tsx apps/mfe-catalog/src/app/products/
git commit -m "feat: add related products section on product detail page"
```

---

## Task 6: Frontend — Wishlist in mfe-catalog (Cluster 3a)

**Files:**
- Create: `lishop-frontend/apps/mfe-catalog/src/lib/wishlist-api.ts`
- Modify: `lishop-frontend/apps/mfe-catalog/src/components/product-card.tsx`
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx`

- [ ] **Step 1: Create wishlist-api.ts**

Create `apps/mfe-catalog/src/lib/wishlist-api.ts`:
```typescript
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('lishop_at');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export async function getWishlist(): Promise<string[]> {
  const data = await apiFetch<{ productIds: string[] }>('/wishlist');
  return data.productIds;
}

export async function addToWishlist(productId: string): Promise<void> {
  await apiFetch(`/wishlist/${productId}`, { method: 'POST' });
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await apiFetch(`/wishlist/${productId}`, { method: 'DELETE' });
}
```

- [ ] **Step 2: Rewrite product-card.tsx with heart icon**

Replace the entire content of `apps/mfe-catalog/src/components/product-card.tsx`:
```typescript
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import type { ProductSummary } from '../lib/catalog-api';
import { getWishlist, addToWishlist, removeFromWishlist, isLoggedIn } from '../lib/wishlist-api';

function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`h-3 w-3 ${i <= Math.round(rating) ? 'text-amber-400' : 'text-stone-200'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs text-muted">({count})</span>
    </div>
  );
}

export function ProductCard({ product }: { product: ProductSummary }) {
  const queryClient = useQueryClient();
  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];

  const { data: wishlistIds = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    enabled: isLoggedIn(),
  });
  const isWishlisted = new Set(wishlistIds).has(product.id);

  const toggleMutation = useMutation({
    mutationFn: () =>
      isWishlisted ? removeFromWishlist(product.id) : addToWishlist(product.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  function handleHeartClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn()) {
      window.location.href = 'http://localhost:3001/login';
      return;
    }
    toggleMutation.mutate();
  }

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="card overflow-hidden h-full flex flex-col">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-50">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt ?? product.name}
              fill
              className="object-cover transition-all duration-350 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-faint text-sm">
              Chưa có ảnh
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-2.5 left-2.5">
            <span className="rounded-lg bg-white/95 backdrop-blur-sm px-2 py-0.5 text-xs font-semibold text-indigo-600 shadow-sm">
              {product.category.name}
            </span>
          </div>

          {/* Heart button */}
          <button
            onClick={handleHeartClick}
            disabled={toggleMutation.isPending}
            className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:scale-110 disabled:opacity-60"
            aria-label={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
          >
            <span className={`text-sm leading-none ${isWishlisted ? 'text-red-500' : 'text-gray-400'}`}>
              {isWishlisted ? '♥' : '♡'}
            </span>
          </button>

          {product.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50 backdrop-blur-[1px]">
              <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-stone-700">
                Hết hàng
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-indigo-900/80 to-transparent px-3 py-3 transition-transform duration-200 group-hover:translate-y-0">
            <p className="text-center text-xs font-medium text-white/90">Xem chi tiết →</p>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-3.5 gap-1.5">
          <h3 className="line-clamp-2 text-sm font-semibold text-stone-800 group-hover:text-indigo-700 transition-colors leading-snug">
            {product.name}
          </h3>
          {product.averageRating > 0 && (
            <Stars rating={product.averageRating} count={product.reviewCount} />
          )}
          <p className="mt-auto text-base font-black text-indigo-600">
            {formatVND(product.priceVnd)}
          </p>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Add wishlist imports and heart button to product detail page**

In `apps/mfe-catalog/src/app/products/[slug]/page.tsx`, add imports at the top:
```typescript
import { getWishlist, addToWishlist, removeFromWishlist, isLoggedIn } from '../../../lib/wishlist-api';
```

Inside `ProductDetailPage`, add wishlist state after existing `useState` declarations:
```typescript
  const queryClient = useQueryClient();

  const { data: wishlistIds = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    enabled: isLoggedIn(),
  });
  const isWishlisted = new Set(wishlistIds).has(product?.id ?? '');

  const toggleWishlistMutation = useMutation({
    mutationFn: () =>
      isWishlisted ? removeFromWishlist(product!.id) : addToWishlist(product!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  function handleToggleWishlist() {
    if (!isLoggedIn()) {
      window.location.href = 'http://localhost:3001/login';
      return;
    }
    toggleWishlistMutation.mutate();
  }
```

Note: `useQueryClient` is already imported from `@tanstack/react-query` in `ReviewsSection`. Add it to the top-level import line in `ProductDetailPage`'s scope:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

Replace the Add to Cart `<div className="mt-4">` block with a flex row that includes the heart button:
```tsx
          <div className="mt-4 flex gap-3">
            <button
              disabled={product.stock === 0 || addingToCart}
              onClick={handleAddToCart}
              className="flex-1 rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingToCart ? 'Đang thêm...' : product.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
            </button>
            <button
              onClick={handleToggleWishlist}
              disabled={toggleWishlistMutation.isPending}
              className={`rounded-md border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
                isWishlisted
                  ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isWishlisted ? '♥ Đã lưu' : '♡ Lưu'}
            </button>
          </div>
          {cartMessage && (
            <p className={`mt-2 text-center text-sm ${cartMessage.includes('Đã') ? 'text-green-600' : 'text-red-600'}`}>
              {cartMessage}
            </p>
          )}
```

- [ ] **Step 4: Test in browser**

Log in at `http://localhost:3001/login` with `nguyen@lishop.vn / Customer@123`.

Then navigate to `http://localhost:3002/products` — heart icons should appear on every card. Click one to fill it red. Navigate to a detail page — the "♡ Lưu" / "♥ Đã lưu" button should reflect state.

- [ ] **Step 5: Commit**

```bash
cd lishop-frontend
git add apps/mfe-catalog/src/lib/wishlist-api.ts apps/mfe-catalog/src/components/product-card.tsx apps/mfe-catalog/src/app/products/
git commit -m "feat: add wishlist heart icons to product card and detail page"
```

---

## Task 7: Frontend — Wishlist Page in mfe-profile (Cluster 3b)

**Files:**
- Create: `lishop-frontend/apps/mfe-profile/src/lib/wishlist-api.ts`
- Create: `lishop-frontend/apps/mfe-profile/src/app/wishlist/page.tsx`
- Modify: `lishop-frontend/apps/mfe-profile/src/components/account-sidebar.tsx`

- [ ] **Step 1: Create wishlist-api.ts for mfe-profile**

Create `apps/mfe-profile/src/lib/wishlist-api.ts`:
```typescript
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('lishop_at');
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  stock: number;
  averageRating: number;
  reviewCount: number;
  category: { id: string; name: string; slug: string };
  images: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
}

export async function getWishlistProducts(): Promise<WishlistProduct[]> {
  return apiFetch<WishlistProduct[]>('/wishlist/products');
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await apiFetch(`/wishlist/${productId}`, { method: 'DELETE' });
}
```

- [ ] **Step 2: Create wishlist page**

Create `apps/mfe-profile/src/app/wishlist/page.tsx`:
```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { AccountSidebar } from '../../components/account-sidebar';
import { MiniHeader } from '../../components/mini-header';
import { MiniFooter } from '../../components/mini-footer';
import { formatVND } from '@lishop/shared';
import { getWishlistProducts, removeFromWishlist, type WishlistProduct } from '../../lib/wishlist-api';

const MFE_CATALOG = process.env['NEXT_PUBLIC_MFE_CATALOG_URL'] ?? 'http://localhost:3002';

export default function WishlistPage() {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['wishlist-products'],
    queryFn: getWishlistProducts,
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWishlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist-products'] }),
  });

  return (
    <div className="flex min-h-screen flex-col bg-warm">
      <MiniHeader title="Yêu thích" backHref={`${MFE_CATALOG}/products`} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-8">
        <AccountSidebar activeSection="wishlist" />
        <div className="flex-1">
          <h1 className="mb-6 text-xl font-bold text-gray-900">Sản phẩm yêu thích</h1>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
              <p className="text-4xl">♡</p>
              <p className="mt-3 font-semibold text-gray-700">Danh sách yêu thích trống</p>
              <p className="mt-1 text-sm text-gray-400">
                Thêm sản phẩm vào yêu thích để xem ở đây
              </p>
              <a
                href={`${MFE_CATALOG}/products`}
                className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Khám phá sản phẩm →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {products.map((product: WishlistProduct) => {
                const img =
                  product.images.find((i) => i.isPrimary) ?? product.images[0];
                return (
                  <div key={product.id} className="card overflow-hidden">
                    <div className="relative aspect-square w-full bg-gray-50">
                      {img ? (
                        <Image
                          src={img.url}
                          alt={img.alt ?? product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-300">
                          Chưa có ảnh
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <a
                        href={`${MFE_CATALOG}/products/${product.slug}`}
                        className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-indigo-600"
                      >
                        {product.name}
                      </a>
                      <p className="mt-1 text-base font-bold text-indigo-600">
                        {formatVND(product.priceVnd)}
                      </p>
                      <button
                        onClick={() => removeMutation.mutate(product.id)}
                        disabled={removeMutation.isPending}
                        className="mt-2 w-full rounded-md border border-red-200 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Xóa khỏi yêu thích
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <MiniFooter />
    </div>
  );
}
```

- [ ] **Step 3: Update account-sidebar to add Wishlist nav item**

In `apps/mfe-profile/src/components/account-sidebar.tsx`, update the `activeSection` type and the `NAV` array:

Change the function signature:
```typescript
export function AccountSidebar({ activeSection }: { activeSection: 'orders' | 'profile' | 'notifications' | 'wishlist' }) {
```

Replace the `NAV` array:
```typescript
const NAV = [
  { icon: '📦', label: 'Đơn hàng của tôi', href: `${MFE_ORDERS}/orders`,       key: 'orders' },
  { icon: '👤', label: 'Trang cá nhân',    href: `${MFE_PROFILE}/profile`,      key: 'profile' },
  { icon: '♡',  label: 'Yêu thích',        href: `${MFE_PROFILE}/wishlist`,     key: 'wishlist' },
  { icon: '🔔', label: 'Thông báo',         href: `${MFE_NOTIF}/notifications`,  key: 'notifications' },
];
```

Update the `isActive` logic inside the map:
```typescript
            const isActive = item.key === activeSection;
```

Remove the old `matchHost` checks entirely.

- [ ] **Step 4: Test in browser**

Navigate to `http://localhost:3006/wishlist`. You should see:
- Account sidebar with "♡ Yêu thích" nav item highlighted
- Grid of wishlisted products (if any were hearted in Task 6)
- "Xóa" button removes the item and re-renders the grid

- [ ] **Step 5: Commit**

```bash
cd lishop-frontend
git add apps/mfe-profile/src/lib/wishlist-api.ts apps/mfe-profile/src/app/wishlist/ apps/mfe-profile/src/components/account-sidebar.tsx
git commit -m "feat: add wishlist page and account sidebar link in mfe-profile"
```

---

## Self-Review

**Spec coverage:**
- ✅ 1.1 Quantity selector — Task 4 steps 1–2
- ✅ 1.2 Low-stock warning — Task 4 step 3
- ✅ 1.3 Image hover zoom — Task 4 step 4
- ✅ 1.4 Star distribution chart — Task 4 step 5
- ✅ 1.5 Review sorting — Task 4 step 5
- ✅ 2.1 Related products endpoint — Task 2
- ✅ 2.2 RelatedProducts component — Task 5
- ✅ 3.1 Wishlist DB model — Task 1
- ✅ 3.2 WishlistModule (GET/GET products/POST/DELETE) — Task 3
- ✅ 3.3a Heart on ProductCard — Task 6 step 2
- ✅ 3.3b Heart on detail page — Task 6 step 3
- ✅ 3.3c Wishlist page in mfe-profile — Task 7

**Placeholder scan:** No TBDs, no "similar to above", all code blocks complete.

**Type consistency:**
- `ProductWithDetails.tags` updated to include `tagId` in Task 2 step 3 — used consistently in `findRelated`
- `WishlistRepository` methods (`findIdsByUserId`, `create`, `delete`, `exists`) match `WishlistService` calls exactly
- `getWishlist()` returns `string[]` in both wishlist-api files; `getWishlistProducts()` only in mfe-profile
- `AccountSidebar` `activeSection` type extended to include `'wishlist'` in Task 7 step 3

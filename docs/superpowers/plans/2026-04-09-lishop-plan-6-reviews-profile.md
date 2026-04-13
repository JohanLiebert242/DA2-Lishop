# Plan 6 — Reviews + Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product reviews (create, list, verified-purchase badge) and user profile management (view + edit name) to the Lishop platform.

**Architecture:** Backend adds `ReviewsModule` (POST/GET reviews, auto-detect verifiedPurchase) and extends `UsersModule` with profile endpoints (GET/PATCH /users/profile). Frontend wires reviews into the existing mfe-catalog product detail page and builds out the stub mfe-profile page.

**Tech Stack:** NestJS 10 + Fastify, Prisma 5, Next.js 15 App Router, TanStack Query v5, `@lishop/shared` (formatVND)

---

## File Map

### Backend — new files
```
apps/api/src/modules/reviews/
  dto/
    create-review.dto.ts
  reviews.repository.ts
  reviews.service.ts
  reviews.service.spec.ts
  reviews.controller.ts
  reviews.module.ts
apps/api/src/modules/users/
  dto/
    update-profile.dto.ts
  users.controller.ts           — new (module currently has no controller)
```

### Backend — modified files
```
apps/api/src/modules/users/users.repository.ts  — add getProfile, updateProfile
apps/api/src/modules/users/users.service.ts     — add getProfile, updateProfile
apps/api/src/modules/users/users.module.ts      — add UsersController, export UsersService
apps/api/src/app.module.ts                      — add ReviewsModule
```

### Frontend — modified files
```
lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts          — add auth + review API
lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx — add ReviewsSection
lishop-frontend/apps/mfe-profile/src/lib/profile-api.ts           — new
lishop-frontend/apps/mfe-profile/src/app/providers.tsx            — new
lishop-frontend/apps/mfe-profile/src/app/layout.tsx               — add Providers + metadata
lishop-frontend/apps/mfe-profile/src/app/profile/page.tsx         — replace stub
```

---

## Task 1: ReviewsRepository + CreateReviewDto

**Files:**
- Create: `lishop-backend/apps/api/src/modules/reviews/dto/create-review.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/reviews/reviews.repository.ts`

- [ ] **Step 1: Create create-review.dto.ts**

Create `lishop-backend/apps/api/src/modules/reviews/dto/create-review.dto.ts`:
```typescript
import { IsInt, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, description: 'Star rating 1-5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;
}
```

- [ ] **Step 2: Create reviews.repository.ts**

Create `lishop-backend/apps/api/src/modules/reviews/reviews.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma, Review, ReviewStatus, OrderStatus, Prisma } from '@lishop/database';

export interface ReviewWithUser {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  verifiedPurchase: boolean;
  createdAt: Date;
}

@Injectable()
export class ReviewsRepository {
  async findByProductId(productId: string): Promise<ReviewWithUser[]> {
    const reviews = await prisma.review.findMany({
      where: { productId, status: ReviewStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    return reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName:
        r.user.firstName && r.user.lastName
          ? `${r.user.firstName} ${r.user.lastName}`
          : r.user.email.split('@')[0],
      rating: r.rating,
      content: r.content,
      verifiedPurchase: r.verifiedPurchase,
      createdAt: r.createdAt,
    }));
  }

  findByProductIdAndUserId(productId: string, userId: string): Promise<Review | null> {
    return prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
    });
  }

  async hasDeliveredOrderWithProduct(userId: string, productId: string): Promise<boolean> {
    const item = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: OrderStatus.DELIVERED },
      },
    });
    return !!item;
  }

  create(data: Prisma.ReviewCreateInput): Promise<Review> {
    return prisma.review.create({ data });
  }
}
```

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/reviews/
git commit -m "feat: add ReviewsRepository with product reviews and verified-purchase check"
```

---

## Task 2: ReviewsService + spec (TDD)

**Files:**
- Create: `lishop-backend/apps/api/src/modules/reviews/reviews.service.spec.ts`
- Create: `lishop-backend/apps/api/src/modules/reviews/reviews.service.ts`

- [ ] **Step 1: Create reviews.service.spec.ts**

Create `lishop-backend/apps/api/src/modules/reviews/reviews.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsRepository } from './reviews.repository';

const mockReview: any = {
  id: 'r1',
  userId: 'u1',
  userName: 'Nguyen Van A',
  rating: 5,
  content: 'Tuyệt vời!',
  verifiedPurchase: false,
  createdAt: new Date(),
};

describe('ReviewsService', () => {
  let service: ReviewsService;
  const repo = {
    findByProductId: jest.fn(),
    findByProductIdAndUserId: jest.fn(),
    hasDeliveredOrderWithProduct: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ReviewsService, { provide: ReviewsRepository, useValue: repo }],
    }).compile();
    service = module.get(ReviewsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getProductReviews returns reviews from repo', async () => {
    repo.findByProductId.mockResolvedValue([mockReview]);
    const result = await service.getProductReviews('p1');
    expect(result).toHaveLength(1);
    expect(repo.findByProductId).toHaveBeenCalledWith('p1');
  });

  it('createReview throws ConflictException when user already reviewed', async () => {
    repo.findByProductIdAndUserId.mockResolvedValue({ id: 'r1' });
    await expect(service.createReview('u1', 'p1', { rating: 5 })).rejects.toThrow(ConflictException);
  });

  it('createReview sets verifiedPurchase=false when no delivered order', async () => {
    repo.findByProductIdAndUserId.mockResolvedValue(null);
    repo.hasDeliveredOrderWithProduct.mockResolvedValue(false);
    repo.create.mockResolvedValue(mockReview);
    await service.createReview('u1', 'p1', { rating: 5 });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ verifiedPurchase: false }));
  });

  it('createReview sets verifiedPurchase=true when user has delivered order', async () => {
    repo.findByProductIdAndUserId.mockResolvedValue(null);
    repo.hasDeliveredOrderWithProduct.mockResolvedValue(true);
    repo.create.mockResolvedValue({ ...mockReview, verifiedPurchase: true });
    await service.createReview('u1', 'p1', { rating: 4, content: 'Good' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ verifiedPurchase: true }));
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=reviews.service.spec --no-coverage 2>&1 | tail -5
```
Expected: FAIL (ReviewsService not found).

- [ ] **Step 3: Create reviews.service.ts**

Create `lishop-backend/apps/api/src/modules/reviews/reviews.service.ts`:
```typescript
import { ConflictException, Injectable } from '@nestjs/common';
import { ReviewsRepository, ReviewWithUser } from './reviews.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review, ReviewStatus } from '@lishop/database';

@Injectable()
export class ReviewsService {
  constructor(private readonly repo: ReviewsRepository) {}

  getProductReviews(productId: string): Promise<ReviewWithUser[]> {
    return this.repo.findByProductId(productId);
  }

  async createReview(userId: string, productId: string, dto: CreateReviewDto): Promise<Review> {
    const existing = await this.repo.findByProductIdAndUserId(productId, userId);
    if (existing) throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi');

    const verifiedPurchase = await this.repo.hasDeliveredOrderWithProduct(userId, productId);

    return this.repo.create({
      rating: dto.rating,
      content: dto.content ?? '',
      status: ReviewStatus.APPROVED,
      verifiedPurchase,
      product: { connect: { id: productId } },
      user: { connect: { id: userId } },
    });
  }
}
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=reviews.service.spec --no-coverage 2>&1 | tail -10
```
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/reviews/reviews.service.ts lishop-backend/apps/api/src/modules/reviews/reviews.service.spec.ts
git commit -m "feat: add ReviewsService with duplicate guard and verified-purchase detection (TDD)"
```

---

## Task 3: ReviewsController + ReviewsModule + AppModule wire

**Files:**
- Create: `lishop-backend/apps/api/src/modules/reviews/reviews.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/reviews/reviews.module.ts`
- Modify: `lishop-backend/apps/api/src/app.module.ts`

- [ ] **Step 1: Create reviews.controller.ts**

Create `lishop-backend/apps/api/src/modules/reviews/reviews.controller.ts`:
```typescript
import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Get approved reviews for a product' })
  getProductReviews(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('product/:productId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a review for a product' })
  createReview(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(userId, productId, dto);
  }
}
```

- [ ] **Step 2: Create reviews.module.ts**

Create `lishop-backend/apps/api/src/modules/reviews/reviews.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ReviewsRepository } from './reviews.repository';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  providers: [ReviewsRepository, ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
```

- [ ] **Step 3: Update app.module.ts**

Read `lishop-backend/apps/api/src/app.module.ts`. Add:
```typescript
import { ReviewsModule } from './modules/reviews/reviews.module';
```
Add `ReviewsModule` to the `imports` array (after OrdersModule).

- [ ] **Step 4: Type-check and run all tests**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -20 && pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -5
```
Expected: 0 errors, all tests pass (~73 tests).

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/reviews/reviews.controller.ts lishop-backend/apps/api/src/modules/reviews/reviews.module.ts lishop-backend/apps/api/src/app.module.ts
git commit -m "feat: wire ReviewsModule with public GET and authenticated POST endpoints"
```

---

## Task 4: UsersModule — profile endpoints

**Files:**
- Create: `lishop-backend/apps/api/src/modules/users/dto/update-profile.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/users/users.controller.ts`
- Modify: `lishop-backend/apps/api/src/modules/users/users.repository.ts`
- Modify: `lishop-backend/apps/api/src/modules/users/users.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/users/users.module.ts`

- [ ] **Step 1: Create update-profile.dto.ts**

Create `lishop-backend/apps/api/src/modules/users/dto/update-profile.dto.ts`:
```typescript
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) avatarUrl?: string;
}
```

- [ ] **Step 2: Add profile methods to users.repository.ts**

Read `lishop-backend/apps/api/src/modules/users/users.repository.ts`. After the existing `updateById` method, add:
```typescript
  async getProfile(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        loyaltyPoints: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(id: string, data: { firstName?: string; lastName?: string; avatarUrl?: string }) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        loyaltyPoints: true,
        role: true,
        createdAt: true,
      },
    });
  }
```

- [ ] **Step 3: Add profile methods to users.service.ts**

Read `lishop-backend/apps/api/src/modules/users/users.service.ts`. After the existing `updateById` method, add:
```typescript
  getProfile(userId: string) {
    return this.repo.getProfile(userId);
  }

  updateProfile(userId: string, dto: { firstName?: string; lastName?: string; avatarUrl?: string }) {
    return this.repo.updateProfile(userId, dto);
  }
```

- [ ] **Step 4: Create users.controller.ts**

Create `lishop-backend/apps/api/src/modules/users/users.controller.ts`:
```typescript
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }
}
```

- [ ] **Step 5: Update users.module.ts**

Replace `lishop-backend/apps/api/src/modules/users/users.module.ts` with:
```typescript
import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  providers: [UsersRepository, UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 6: Type-check and run all tests**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -20 && pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -5
```
Expected: 0 errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/users/
git commit -m "feat: add GET/PATCH /users/profile endpoints for user profile management"
```

---

## Task 5: mfe-catalog — reviews in catalog-api.ts + product detail page

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx`

- [ ] **Step 1: Update catalog-api.ts — add auth support and review functions**

Read `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`.

Replace the top of the file (before the `catalogApi` object) to add `getToken` and update `apiFetch` to include auth. Then add `ReviewInfo` interface and review functions.

The updated file should be:
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
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryItem extends CategoryInfo {
  imageUrl: string | null;
  parentId: string | null;
  children?: CategoryItem[];
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  averageRating: number;
  reviewCount: number;
  categoryId: string;
  images: ProductImage[];
  tags: { tag: { name: string } }[];
  category: CategoryInfo;
  createdAt: string;
}

export interface ProductDetail extends ProductSummary {
  description: string;
}

export interface ProductListResponse {
  items: ProductSummary[];
  nextCursor: string | null;
}

export interface ProductListParams {
  cursor?: string;
  limit?: number;
  categoryId?: string;
  minPriceVnd?: number;
  maxPriceVnd?: number;
  q?: string;
  sort?: 'price_asc' | 'price_desc' | 'rating_desc' | 'newest';
}

export interface ReviewInfo {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export const catalogApi = {
  getCategories: () =>
    apiFetch<CategoryItem[]>('/categories'),

  getProducts: (params: ProductListParams = {}) => {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.categoryId) qs.set('categoryId', params.categoryId);
    if (params.minPriceVnd !== undefined) qs.set('minPriceVnd', String(params.minPriceVnd));
    if (params.maxPriceVnd !== undefined) qs.set('maxPriceVnd', String(params.maxPriceVnd));
    if (params.q) qs.set('q', params.q);
    if (params.sort) qs.set('sort', params.sort);
    return apiFetch<ProductListResponse>(`/products?${qs}`);
  },

  getProduct: (slug: string) =>
    apiFetch<ProductDetail>(`/products/${slug}`),

  getFeatured: (limit = 8) =>
    apiFetch<ProductSummary[]>(`/products/featured?limit=${limit}`),

  getProductReviews: (productId: string) =>
    apiFetch<ReviewInfo[]>(`/reviews/product/${productId}`),

  createReview: (productId: string, rating: number, content?: string) =>
    apiFetch<ReviewInfo>(`/reviews/product/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ rating, content }),
    }),
};
```

- [ ] **Step 2: Add ReviewsSection to product detail page**

Read `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx`.

Add the following imports at the top (after existing imports):
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ReviewInfo } from '../../../lib/catalog-api';
```

Add these two components before the `export default function ProductDetailPage` line:
```typescript
function Stars({ rating, interactive = false, onSelect }: { rating: number; interactive?: boolean; onSelect?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          onClick={() => interactive && onSelect?.(s)}
          className={`${s <= rating ? 'text-yellow-400' : 'text-gray-300'} ${interactive ? 'cursor-pointer text-2xl' : 'text-base'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewsSection({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('lishop_at') : null;

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => catalogApi.getProductReviews(productId),
  });

  const submitMutation = useMutation({
    mutationFn: () => catalogApi.createReview(productId, rating, content || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      setShowForm(false);
      setContent('');
      setRating(5);
    },
  });

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <div className="mt-8 border-t pt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Đánh giá khách hàng</h2>
          {reviews.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <Stars rating={Math.round(avgRating)} />
              <span className="text-sm text-gray-500">
                {avgRating.toFixed(1)} ({reviews.length} đánh giá)
              </span>
            </div>
          )}
        </div>
        {token && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Viết đánh giá
          </button>
        )}
        {!token && (
          <a href="http://localhost:3001/login" className="text-sm text-indigo-600 hover:underline">
            Đăng nhập để đánh giá
          </a>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Đánh giá của bạn</p>
          <Stars rating={rating} interactive onSelect={setRating} />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhận xét của bạn (tùy chọn)..."
            rows={3}
            className="mt-3 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitMutation.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
          {submitMutation.isError && (
            <p className="mt-2 text-xs text-red-600">
              {(submitMutation.error as Error).message}
            </p>
          )}
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-400">Chưa có đánh giá nào.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: ReviewInfo) => (
            <div key={review.id} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{review.userName}</span>
                  {review.verifiedPurchase && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                      Đã mua
                    </span>
                  )}
                </div>
                <Stars rating={review.rating} />
              </div>
              {review.content && (
                <p className="text-sm text-gray-600">{review.content}</p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                {new Date(review.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Then in `ProductDetailPage`'s return statement, add `<ReviewsSection productId={product.id} />` just before the final closing `</div>` of the page wrapper. The end of the return should look like:
```tsx
          </div>
        </div>
      </div>
      <ReviewsSection productId={product.id} />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-catalog tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors. Fix any issues.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx
git commit -m "feat: add reviews section to product detail page with star rating and verified-purchase badge"
```

---

## Task 6: mfe-profile — full profile page

**Files:**
- Create: `lishop-frontend/apps/mfe-profile/src/lib/profile-api.ts`
- Create: `lishop-frontend/apps/mfe-profile/src/app/providers.tsx`
- Modify: `lishop-frontend/apps/mfe-profile/src/app/layout.tsx`
- Modify: `lishop-frontend/apps/mfe-profile/src/app/profile/page.tsx`

- [ ] **Step 1: Create profile-api.ts**

Create `lishop-frontend/apps/mfe-profile/src/lib/profile-api.ts`:
```typescript
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('lishop_at');
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  loyaltyPoints: number;
  role: string;
  createdAt: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export const profileApi = {
  getProfile: () => apiFetch<UserProfile>('/users/profile'),
  updateProfile: (data: UpdateProfileInput) =>
    apiFetch<UserProfile>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
```

- [ ] **Step 2: Create providers.tsx**

Create `lishop-frontend/apps/mfe-profile/src/app/providers.tsx`:
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 3: Update layout.tsx**

Replace `lishop-frontend/apps/mfe-profile/src/app/layout.tsx` with:
```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Trang cá nhân — Lishop',
  description: 'Quản lý thông tin cá nhân của bạn',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Replace profile/page.tsx**

Replace `lishop-frontend/apps/mfe-profile/src/app/profile/page.tsx` with:
```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, UpdateProfileInput } from '../../lib/profile-api';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateProfileInput>({});
  const [message, setMessage] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getProfile(),
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileInput) => profileApi.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], updated);
      setEditing(false);
      setMessage('Cập nhật thành công!');
      setTimeout(() => setMessage(''), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-gray-400">Đang tải...</div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-500">Vui lòng đăng nhập để xem trang cá nhân.</p>
        <a
          href="http://localhost:3001/login"
          className="mt-4 inline-block text-indigo-600 hover:underline text-sm"
        >
          Đăng nhập
        </a>
      </div>
    );
  }

  const initials = (profile.firstName?.[0] ?? profile.email[0]).toUpperCase();
  const displayName =
    profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.email;

  function handleEdit() {
    setForm({ firstName: profile!.firstName ?? '', lastName: profile!.lastName ?? '' });
    setEditing(true);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Trang cá nhân</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Avatar + name */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white overflow-hidden shrink-0">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={displayName} className="h-16 w-16 object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{displayName}</p>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <p className="text-xs text-indigo-600 mt-0.5">{profile.loyaltyPoints} điểm tích lũy</p>
          </div>
        </div>

        {message && (
          <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
        )}

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Họ</label>
              <input
                value={form.firstName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tên</label>
              <input
                value={form.lastName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => updateMutation.mutate(form)}
                disabled={updateMutation.isPending}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Họ và tên</span>
              <span className="text-gray-900">{displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-900">{profile.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vai trò</span>
              <span className="text-gray-900">
                {profile.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}
              </span>
            </div>
            <button
              onClick={handleEdit}
              className="mt-4 w-full rounded-md bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Chỉnh sửa
            </button>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a
          href="http://localhost:3005/orders"
          className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-2xl">📦</p>
          <p className="mt-1 text-sm font-medium text-gray-700">Đơn hàng</p>
        </a>
        <a
          href="http://localhost:3003/cart"
          className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-2xl">🛒</p>
          <p className="mt-1 text-sm font-medium text-gray-700">Giỏ hàng</p>
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-profile tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-profile/src/
git commit -m "feat: add mfe-profile page with edit form, loyalty points, and quick links"
```

---

## Self-Review: Spec Coverage Check

| Requirement | Task |
|---|---|
| GET /reviews/product/:productId (public, returns APPROVED only) | Task 3 |
| POST /reviews/product/:productId (authenticated, ConflictException on duplicate) | Tasks 2–3 |
| verifiedPurchase auto-set from DELIVERED orders | Tasks 1–2 |
| ReviewStatus.APPROVED on create | Task 2 |
| GET /users/profile (authenticated) | Task 4 |
| PATCH /users/profile (authenticated, partial update) | Task 4 |
| UsersModule exposes UsersController | Task 4 |
| catalog-api.ts auth-aware apiFetch | Task 5 |
| Product detail page shows reviews list with star display | Task 5 |
| Product detail page shows verified-purchase badge | Task 5 |
| Authenticated users can submit a review with star picker | Task 5 |
| mfe-profile shows name, email, loyalty points, role | Task 6 |
| mfe-profile edit form updates firstName + lastName | Task 6 |
| mfe-profile quick links to orders + cart | Task 6 |

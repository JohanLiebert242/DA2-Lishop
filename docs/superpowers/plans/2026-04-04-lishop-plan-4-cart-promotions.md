# Plan 4 — Cart + Promotions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the cart system (add/remove/update items, apply coupons) and promotions system (coupon validation, active flash sales), plus mfe-cart and mfe-promotions frontend apps.

**Architecture:** Backend uses two NestJS modules — `PromotionsModule` (CouponsService + FlashSalesService, created first so CartModule can depend on it) and `CartModule` (CartService assembles cart totals from CartItem rows + Prisma product join; coupon code stored in Redis `cart:coupon:{userId}`). All cart endpoints require auth (no @Public()). Flash-sale endpoints are @Public(). Frontend mfe-cart reads `localStorage.getItem('lishop_at')` for the Bearer token.

**Tech Stack:** NestJS 10 + Fastify, Prisma 5, ioredis (RedisService.setex/get/del), Next.js 15 App Router, TanStack Query v5, `@lishop/shared` (formatVND, cn)

---

## File Map

### Backend — new files
```
apps/api/src/modules/
  promotions/
    coupons.repository.ts     — Prisma CRUD for Coupon + CouponUsage
    coupons.service.ts        — validateCoupon, tryValidate, calculateDiscount
    coupons.service.spec.ts
    flash-sales.repository.ts — findActive (now between startAt/endAt, isActive=true)
    flash-sales.service.ts    — findActive wrapper
    promotions.controller.ts  — GET /promotions/flash-sales/active
    promotions.module.ts      — exports CouponsService
  cart/
    cart.repository.ts        — CartItem CRUD + product join for cart display
    cart.service.ts           — buildCart, addItem, updateItem, removeItem, applyCoupon, removeCoupon
    cart.service.spec.ts
    cart.controller.ts        — auth-guarded CRUD + coupon endpoints
    cart.module.ts            — imports PromotionsModule + ProductsModule
    dto/
      add-cart-item.dto.ts
      update-cart-item.dto.ts
      apply-coupon.dto.ts
```

### Backend — modified files
```
apps/api/src/app.module.ts   — add PromotionsModule + CartModule imports
```

### Frontend mfe-cart — new/modified files
```
apps/mfe-cart/src/
  lib/
    cart-api.ts              — typed fetch wrapper for /cart endpoints
  app/
    providers.tsx            — QueryClientProvider
    layout.tsx               — update with Providers + metadata
    cart/page.tsx            — full cart UI (items, quantities, coupon, totals)
```

### Frontend mfe-catalog — modified files
```
apps/mfe-catalog/src/app/products/[slug]/page.tsx  — wire add-to-cart button
```

### Frontend mfe-promotions — new/modified files
```
apps/mfe-promotions/src/
  lib/
    promotions-api.ts        — typed fetch wrapper for /promotions endpoints
  components/
    flash-sale-banner.tsx    — displays active flash sale with countdown
    coupon-widget.tsx        — coupon code input + validate feedback
  app/
    providers.tsx
    layout.tsx               — update with Providers + metadata
    promotions/page.tsx      — flash sales + coupon widget
```

---

## Task 1: CouponsRepository

**Files:**
- Create: `lishop-backend/apps/api/src/modules/promotions/coupons.repository.ts`

- [ ] **Step 1: Create coupons.repository.ts**

Create `lishop-backend/apps/api/src/modules/promotions/coupons.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma, Coupon, Prisma } from '@lishop/database';

@Injectable()
export class CouponsRepository {
  findByCode(code: string): Promise<Coupon | null> {
    return prisma.coupon.findUnique({ where: { code } });
  }

  findById(id: string): Promise<Coupon | null> {
    return prisma.coupon.findUnique({ where: { id } });
  }

  async hasUsed(couponId: string, userId: string): Promise<boolean> {
    const usage = await prisma.couponUsage.findUnique({
      where: { couponId_userId: { couponId, userId } },
    });
    return usage !== null;
  }

  async recordUsage(couponId: string, userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.couponUsage.create({ data: { couponId, userId } }),
      prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } }),
    ]);
  }

  create(data: Prisma.CouponCreateInput): Promise<Coupon> {
    return prisma.coupon.create({ data });
  }

  findAll(): Promise<Coupon[]> {
    return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/promotions/coupons.repository.ts
git commit -m "feat: add CouponsRepository with usage tracking"
```

---

## Task 2: CouponsService + spec

**Files:**
- Create: `lishop-backend/apps/api/src/modules/promotions/coupons.service.ts`
- Create: `lishop-backend/apps/api/src/modules/promotions/coupons.service.spec.ts`

- [ ] **Step 1: Create coupons.service.spec.ts**

Create `lishop-backend/apps/api/src/modules/promotions/coupons.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsRepository } from './coupons.repository';

const makeCoupon = (overrides: Partial<any> = {}): any => ({
  id: 'coupon-1',
  code: 'SAVE10',
  type: 'PERCENT',
  value: 10,
  minOrderVnd: 100000,
  maxUses: null,
  usedCount: 0,
  expiresAt: null,
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

describe('CouponsService', () => {
  let service: CouponsService;
  const repo = {
    findByCode: jest.fn(),
    findById: jest.fn(),
    hasUsed: jest.fn(),
    recordUsage: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CouponsService, { provide: CouponsRepository, useValue: repo }],
    }).compile();
    service = module.get(CouponsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('validateCoupon throws when coupon not found', async () => {
    repo.findByCode.mockResolvedValue(null);
    await expect(service.validateCoupon('FAKE', 'u1', 500000)).rejects.toThrow(BadRequestException);
  });

  it('validateCoupon throws when inactive', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon({ isActive: false }));
    await expect(service.validateCoupon('SAVE10', 'u1', 500000)).rejects.toThrow(BadRequestException);
  });

  it('validateCoupon throws when expired', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon({ expiresAt: new Date('2000-01-01') }));
    await expect(service.validateCoupon('SAVE10', 'u1', 500000)).rejects.toThrow(BadRequestException);
  });

  it('validateCoupon throws when below minimum order', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon({ minOrderVnd: 1000000 }));
    repo.hasUsed.mockResolvedValue(false);
    await expect(service.validateCoupon('SAVE10', 'u1', 500000)).rejects.toThrow(BadRequestException);
  });

  it('validateCoupon throws when already used by user', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon());
    repo.hasUsed.mockResolvedValue(true);
    await expect(service.validateCoupon('SAVE10', 'u1', 500000)).rejects.toThrow(BadRequestException);
  });

  it('validateCoupon returns coupon and PERCENT discount', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon({ type: 'PERCENT', value: 10 }));
    repo.hasUsed.mockResolvedValue(false);
    const result = await service.validateCoupon('SAVE10', 'u1', 500000);
    expect(result.coupon.code).toBe('SAVE10');
    expect(result.discountVnd).toBe(50000); // 10% of 500000
  });

  it('validateCoupon returns FIXED discount (capped at subtotal)', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon({ type: 'FIXED', value: 200000 }));
    repo.hasUsed.mockResolvedValue(false);
    const result = await service.validateCoupon('SAVE10', 'u1', 150000);
    expect(result.discountVnd).toBe(150000); // capped at subtotal
  });

  it('tryValidate returns null when coupon invalid', async () => {
    repo.findByCode.mockResolvedValue(null);
    const result = await service.tryValidate('FAKE', 'u1', 500000);
    expect(result).toBeNull();
  });

  it('calculateDiscount FREE_SHIPPING returns 0', () => {
    const coupon = makeCoupon({ type: 'FREE_SHIPPING', value: 0 });
    expect(service.calculateDiscount(coupon, 500000)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=coupons.service.spec --no-coverage 2>&1 | tail -5
```
Expected: FAIL — CouponsService not found.

- [ ] **Step 3: Create coupons.service.ts**

Create `lishop-backend/apps/api/src/modules/promotions/coupons.service.ts`:
```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import { CouponType } from '@lishop/database';
import { CouponsRepository } from './coupons.repository';

export interface CouponValidationResult {
  coupon: { id: string; code: string; type: string; value: number };
  discountVnd: number;
}

@Injectable()
export class CouponsService {
  constructor(private readonly repo: CouponsRepository) {}

  async validateCoupon(
    code: string,
    userId: string,
    subtotalVnd: number,
  ): Promise<CouponValidationResult> {
    const coupon = await this.repo.findByCode(code);
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Mã giảm giá không hợp lệ');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }
    if (subtotalVnd < coupon.minOrderVnd) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${coupon.minOrderVnd.toLocaleString('vi-VN')}đ để dùng mã này`,
      );
    }
    const hasUsed = await this.repo.hasUsed(coupon.id, userId);
    if (hasUsed) {
      throw new BadRequestException('Bạn đã sử dụng mã giảm giá này rồi');
    }

    const discountVnd = this.calculateDiscount(coupon, subtotalVnd);
    return { coupon, discountVnd };
  }

  async tryValidate(
    code: string,
    userId: string,
    subtotalVnd: number,
  ): Promise<CouponValidationResult | null> {
    try {
      return await this.validateCoupon(code, userId, subtotalVnd);
    } catch {
      return null;
    }
  }

  calculateDiscount(coupon: { type: string; value: number }, subtotalVnd: number): number {
    if (coupon.type === CouponType.PERCENT) {
      return Math.floor((subtotalVnd * coupon.value) / 100);
    }
    if (coupon.type === CouponType.FIXED) {
      return Math.min(coupon.value, subtotalVnd);
    }
    // FREE_SHIPPING — handled at checkout level, no VND discount here
    return 0;
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=coupons.service.spec --no-coverage 2>&1 | tail -10
```
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/promotions/coupons.service.ts lishop-backend/apps/api/src/modules/promotions/coupons.service.spec.ts
git commit -m "feat: add CouponsService with validation and discount calculation"
```

---

## Task 3: FlashSalesRepository + FlashSalesService

**Files:**
- Create: `lishop-backend/apps/api/src/modules/promotions/flash-sales.repository.ts`
- Create: `lishop-backend/apps/api/src/modules/promotions/flash-sales.service.ts`

- [ ] **Step 1: Create flash-sales.repository.ts**

Create `lishop-backend/apps/api/src/modules/promotions/flash-sales.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma } from '@lishop/database';

export interface FlashSaleWithItems {
  id: string;
  startAt: Date;
  endAt: Date;
  isActive: boolean;
  items: {
    id: string;
    discountPercent: number;
    product: {
      id: string;
      name: string;
      slug: string;
      priceVnd: number;
      images: { url: string }[];
    };
  }[];
}

@Injectable()
export class FlashSalesRepository {
  async findActive(): Promise<FlashSaleWithItems[]> {
    const now = new Date();
    return prisma.flashSale.findMany({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                priceVnd: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
      },
      orderBy: { startAt: 'desc' },
    });
  }
}
```

- [ ] **Step 2: Create flash-sales.service.ts**

Create `lishop-backend/apps/api/src/modules/promotions/flash-sales.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { FlashSalesRepository, FlashSaleWithItems } from './flash-sales.repository';

@Injectable()
export class FlashSalesService {
  constructor(private readonly repo: FlashSalesRepository) {}

  findActive(): Promise<FlashSaleWithItems[]> {
    return this.repo.findActive();
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/promotions/flash-sales.repository.ts lishop-backend/apps/api/src/modules/promotions/flash-sales.service.ts
git commit -m "feat: add FlashSalesRepository + FlashSalesService"
```

---

## Task 4: PromotionsController + PromotionsModule + AppModule wire

**Files:**
- Create: `lishop-backend/apps/api/src/modules/promotions/promotions.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/promotions/promotions.module.ts`
- Modify: `lishop-backend/apps/api/src/app.module.ts`

- [ ] **Step 1: Create promotions.controller.ts**

Create `lishop-backend/apps/api/src/modules/promotions/promotions.controller.ts`:
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FlashSalesService } from './flash-sales.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('promotions')
@Controller('promotions')
@UseGuards(JwtAuthGuard)
export class PromotionsController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Public()
  @Get('flash-sales/active')
  @ApiOperation({ summary: 'Get currently active flash sales' })
  async activeFlashSales() {
    return this.flashSalesService.findActive();
  }
}
```

- [ ] **Step 2: Create promotions.module.ts**

Create `lishop-backend/apps/api/src/modules/promotions/promotions.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CouponsRepository } from './coupons.repository';
import { CouponsService } from './coupons.service';
import { FlashSalesRepository } from './flash-sales.repository';
import { FlashSalesService } from './flash-sales.service';
import { PromotionsController } from './promotions.controller';

@Module({
  providers: [CouponsRepository, CouponsService, FlashSalesRepository, FlashSalesService],
  controllers: [PromotionsController],
  exports: [CouponsService],
})
export class PromotionsModule {}
```

- [ ] **Step 3: Update app.module.ts**

Read `lishop-backend/apps/api/src/app.module.ts` and add PromotionsModule. The file currently imports RedisModule, AuthModule, CategoriesModule, ProductsModule. Add:
```typescript
import { PromotionsModule } from './modules/promotions/promotions.module';
```
And add `PromotionsModule` to the `imports` array.

- [ ] **Step 4: Type-check and test**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -20
pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -10
```
Expected: 0 type errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/promotions/promotions.controller.ts lishop-backend/apps/api/src/modules/promotions/promotions.module.ts lishop-backend/apps/api/src/app.module.ts
git commit -m "feat: wire PromotionsModule into AppModule with flash-sales endpoint"
```

---

## Task 5: CartRepository

**Files:**
- Create: `lishop-backend/apps/api/src/modules/cart/cart.repository.ts`
- Create: `lishop-backend/apps/api/src/modules/cart/dto/add-cart-item.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/cart/dto/update-cart-item.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/cart/dto/apply-coupon.dto.ts`

- [ ] **Step 1: Create DTOs**

Create `lishop-backend/apps/api/src/modules/cart/dto/add-cart-item.dto.ts`:
```typescript
import { IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @ApiProperty() @IsUUID() productId!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Type(() => Number) quantity!: number;
}
```

Create `lishop-backend/apps/api/src/modules/cart/dto/update-cart-item.dto.ts`:
```typescript
import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Type(() => Number) quantity!: number;
}
```

Create `lishop-backend/apps/api/src/modules/cart/dto/apply-coupon.dto.ts`:
```typescript
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyCouponDto {
  @ApiProperty() @IsString() @MinLength(1) code!: string;
}
```

- [ ] **Step 2: Create cart.repository.ts**

Create `lishop-backend/apps/api/src/modules/cart/cart.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma } from '@lishop/database';

export interface CartRow {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    priceVnd: number;
    priceUsd: number;
    stock: number;
    images: { url: string }[];
  };
}

export interface ProductStockInfo {
  id: string;
  stock: number;
}

@Injectable()
export class CartRepository {
  async findByUserId(userId: string): Promise<CartRow[]> {
    return prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            priceVnd: true,
            priceUsd: true,
            stock: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }) as Promise<CartRow[]>;
  }

  async addOrUpdate(userId: string, productId: string, quantity: number): Promise<void> {
    await prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, quantity },
      update: { quantity },
    });
  }

  async remove(userId: string, productId: string): Promise<void> {
    await prisma.cartItem.deleteMany({ where: { userId, productId } });
  }

  async clear(userId: string): Promise<void> {
    await prisma.cartItem.deleteMany({ where: { userId } });
  }

  async findProduct(productId: string): Promise<ProductStockInfo | null> {
    return prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true },
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/cart/
git commit -m "feat: add CartRepository and cart DTOs"
```

---

## Task 6: CartService + spec

**Files:**
- Create: `lishop-backend/apps/api/src/modules/cart/cart.service.ts`
- Create: `lishop-backend/apps/api/src/modules/cart/cart.service.spec.ts`

- [ ] **Step 1: Create cart.service.spec.ts**

Create `lishop-backend/apps/api/src/modules/cart/cart.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartRepository } from './cart.repository';
import { CouponsService } from '../promotions/coupons.service';
import { RedisService } from '../redis/redis.service';

const makeRow = (overrides: Partial<any> = {}): any => ({
  id: 'ci1',
  productId: 'p1',
  quantity: 2,
  product: {
    id: 'p1',
    name: 'iPhone 15',
    slug: 'iphone-15',
    priceVnd: 20000000,
    priceUsd: 800,
    stock: 5,
    images: [{ url: 'https://img.jpg' }],
  },
  ...overrides,
});

describe('CartService', () => {
  let service: CartService;
  const repo = {
    findByUserId: jest.fn(),
    addOrUpdate: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    findProduct: jest.fn(),
  };
  const couponsService = { tryValidate: jest.fn() };
  const redis = { get: jest.fn(), setex: jest.fn(), del: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: CartRepository, useValue: repo },
        { provide: CouponsService, useValue: couponsService },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();
    service = module.get(CartService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getCart returns empty cart when no items', async () => {
    repo.findByUserId.mockResolvedValue([]);
    redis.get.mockResolvedValue(null);
    const cart = await service.getCart('u1');
    expect(cart.items).toHaveLength(0);
    expect(cart.subtotalVnd).toBe(0);
    expect(cart.totalVnd).toBe(0);
    expect(cart.couponCode).toBeNull();
    expect(cart.discountVnd).toBe(0);
  });

  it('getCart computes subtotals from items', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue(null);
    const cart = await service.getCart('u1');
    expect(cart.subtotalVnd).toBe(40000000); // 20000000 * 2
    expect(cart.totalVnd).toBe(40000000);
  });

  it('getCart applies stored coupon discount from Redis', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue('SAVE10');
    couponsService.tryValidate.mockResolvedValue({ discountVnd: 4000000 });
    const cart = await service.getCart('u1');
    expect(cart.couponCode).toBe('SAVE10');
    expect(cart.discountVnd).toBe(4000000);
    expect(cart.totalVnd).toBe(36000000);
  });

  it('getCart silently clears invalid Redis coupon', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue('EXPIRED');
    couponsService.tryValidate.mockResolvedValue(null);
    const cart = await service.getCart('u1');
    expect(cart.couponCode).toBeNull();
    expect(redis.del).toHaveBeenCalledWith('cart:coupon:u1');
  });

  it('addItem throws NotFoundException when product not found', async () => {
    repo.findProduct.mockResolvedValue(null);
    await expect(service.addItem('u1', { productId: 'p99', quantity: 1 })).rejects.toThrow(NotFoundException);
  });

  it('addItem throws BadRequestException when insufficient stock', async () => {
    repo.findProduct.mockResolvedValue({ id: 'p1', stock: 1 });
    await expect(service.addItem('u1', { productId: 'p1', quantity: 5 })).rejects.toThrow(BadRequestException);
  });

  it('addItem calls addOrUpdate and returns updated cart', async () => {
    repo.findProduct.mockResolvedValue({ id: 'p1', stock: 10 });
    repo.addOrUpdate.mockResolvedValue(undefined);
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue(null);
    const cart = await service.addItem('u1', { productId: 'p1', quantity: 2 });
    expect(repo.addOrUpdate).toHaveBeenCalledWith('u1', 'p1', 2);
    expect(cart.items).toHaveLength(1);
  });

  it('applyCoupon stores code in Redis and returns cart with discount', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue(null);
    couponsService.tryValidate
      .mockResolvedValueOnce({ discountVnd: 4000000 }) // during applyCoupon validation
      .mockResolvedValueOnce({ discountVnd: 4000000 }); // during buildCart
    const cart = await service.applyCoupon('u1', 'SAVE10');
    expect(redis.setex).toHaveBeenCalledWith('cart:coupon:u1', 86400, 'SAVE10');
    expect(cart.discountVnd).toBe(4000000);
  });

  it('applyCoupon throws when coupon invalid', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue(null);
    couponsService.tryValidate.mockResolvedValue(null);
    await expect(service.applyCoupon('u1', 'FAKE')).rejects.toThrow(BadRequestException);
  });

  it('removeCoupon clears Redis and returns cart without discount', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue(null);
    const cart = await service.removeCoupon('u1');
    expect(redis.del).toHaveBeenCalledWith('cart:coupon:u1');
    expect(cart.discountVnd).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=cart.service.spec --no-coverage 2>&1 | tail -5
```
Expected: FAIL — CartService not found.

- [ ] **Step 3: Create cart.service.ts**

Create `lishop-backend/apps/api/src/modules/cart/cart.service.ts`:
```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { CouponsService } from '../promotions/coupons.service';
import { RedisService } from '../redis/redis.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

export interface CartItemDto {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  quantity: number;
  priceVnd: number;
  priceUsd: number;
  stock: number;
}

export interface CartDto {
  items: CartItemDto[];
  subtotalVnd: number;
  subtotalUsd: number;
  couponCode: string | null;
  discountVnd: number;
  totalVnd: number;
}

@Injectable()
export class CartService {
  constructor(
    private readonly repo: CartRepository,
    private readonly couponsService: CouponsService,
    private readonly redis: RedisService,
  ) {}

  async getCart(userId: string): Promise<CartDto> {
    return this.buildCart(userId);
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartDto> {
    const product = await this.repo.findProduct(dto.productId);
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    if (product.stock < dto.quantity) {
      throw new BadRequestException(`Chỉ còn ${product.stock} sản phẩm trong kho`);
    }
    await this.repo.addOrUpdate(userId, dto.productId, dto.quantity);
    return this.buildCart(userId);
  }

  async updateItem(userId: string, productId: string, dto: UpdateCartItemDto): Promise<CartDto> {
    const product = await this.repo.findProduct(productId);
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    if (product.stock < dto.quantity) {
      throw new BadRequestException(`Chỉ còn ${product.stock} sản phẩm trong kho`);
    }
    await this.repo.addOrUpdate(userId, productId, dto.quantity);
    return this.buildCart(userId);
  }

  async removeItem(userId: string, productId: string): Promise<CartDto> {
    await this.repo.remove(userId, productId);
    return this.buildCart(userId);
  }

  async applyCoupon(userId: string, code: string): Promise<CartDto> {
    const items = await this.repo.findByUserId(userId);
    const subtotalVnd = items.reduce((s, i) => s + i.product.priceVnd * i.quantity, 0);
    const result = await this.couponsService.tryValidate(code, userId, subtotalVnd);
    if (!result) throw new BadRequestException('Mã giảm giá không hợp lệ hoặc không áp dụng được');
    await this.redis.setex(`cart:coupon:${userId}`, 86400, code);
    return this.buildCart(userId);
  }

  async removeCoupon(userId: string): Promise<CartDto> {
    await this.redis.del(`cart:coupon:${userId}`);
    return this.buildCart(userId);
  }

  private async buildCart(userId: string): Promise<CartDto> {
    const rows = await this.repo.findByUserId(userId);

    const items: CartItemDto[] = rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productName: row.product.name,
      productSlug: row.product.slug,
      imageUrl: row.product.images[0]?.url ?? null,
      quantity: row.quantity,
      priceVnd: row.product.priceVnd,
      priceUsd: row.product.priceUsd,
      stock: row.product.stock,
    }));

    const subtotalVnd = items.reduce((s, i) => s + i.priceVnd * i.quantity, 0);
    const subtotalUsd = items.reduce((s, i) => s + i.priceUsd * i.quantity, 0);

    const couponCode = await this.redis.get(`cart:coupon:${userId}`);
    let discountVnd = 0;
    let resolvedCouponCode: string | null = null;

    if (couponCode) {
      const result = await this.couponsService.tryValidate(couponCode, userId, subtotalVnd);
      if (result) {
        discountVnd = result.discountVnd;
        resolvedCouponCode = couponCode;
      } else {
        await this.redis.del(`cart:coupon:${userId}`);
      }
    }

    return {
      items,
      subtotalVnd,
      subtotalUsd,
      couponCode: resolvedCouponCode,
      discountVnd,
      totalVnd: Math.max(0, subtotalVnd - discountVnd),
    };
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=cart.service.spec --no-coverage 2>&1 | tail -10
```
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/cart/cart.service.ts lishop-backend/apps/api/src/modules/cart/cart.service.spec.ts
git commit -m "feat: add CartService with coupon-in-Redis pattern (TDD)"
```

---

## Task 7: CartController + CartModule + AppModule wire

**Files:**
- Create: `lishop-backend/apps/api/src/modules/cart/cart.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/cart/cart.module.ts`
- Modify: `lishop-backend/apps/api/src/app.module.ts`

- [ ] **Step 1: Create cart.controller.ts**

Create `lishop-backend/apps/api/src/modules/cart/cart.controller.ts`:
```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  async getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or update item in cart' })
  async addItem(@CurrentUser('id') userId: string, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update item quantity' })
  async updateItem(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, productId, dto);
  }

  @Delete('items/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.cartService.removeItem(userId, productId);
  }

  @Post('coupon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply coupon code to cart' })
  async applyCoupon(@CurrentUser('id') userId: string, @Body() dto: ApplyCouponDto) {
    return this.cartService.applyCoupon(userId, dto.code);
  }

  @Delete('coupon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove applied coupon from cart' })
  async removeCoupon(@CurrentUser('id') userId: string) {
    return this.cartService.removeCoupon(userId);
  }
}
```

- [ ] **Step 2: Create cart.module.ts**

Create `lishop-backend/apps/api/src/modules/cart/cart.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [PromotionsModule],
  providers: [CartRepository, CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
```

- [ ] **Step 3: Update app.module.ts**

Read `lishop-backend/apps/api/src/app.module.ts` and add CartModule:
```typescript
import { CartModule } from './modules/cart/cart.module';
```
Add `CartModule` to the `imports` array (after PromotionsModule).

- [ ] **Step 4: Type-check and run all tests**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -20
pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -15
```
Expected: 0 type errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/cart/cart.controller.ts lishop-backend/apps/api/src/modules/cart/cart.module.ts lishop-backend/apps/api/src/app.module.ts
git commit -m "feat: wire CartModule into AppModule with full REST cart endpoints"
```

---

## Task 8: mfe-cart — API client + providers + layout

**Files:**
- Create: `lishop-frontend/apps/mfe-cart/src/lib/cart-api.ts`
- Create: `lishop-frontend/apps/mfe-cart/src/app/providers.tsx`
- Modify: `lishop-frontend/apps/mfe-cart/src/app/layout.tsx`

- [ ] **Step 1: Create cart-api.ts**

Create `lishop-frontend/apps/mfe-cart/src/lib/cart-api.ts`:
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

export interface CartItemData {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  quantity: number;
  priceVnd: number;
  priceUsd: number;
  stock: number;
}

export interface CartData {
  items: CartItemData[];
  subtotalVnd: number;
  subtotalUsd: number;
  couponCode: string | null;
  discountVnd: number;
  totalVnd: number;
}

export const cartApi = {
  getCart: () => apiFetch<CartData>('/cart'),

  addItem: (productId: string, quantity: number) =>
    apiFetch<CartData>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),

  updateItem: (productId: string, quantity: number) =>
    apiFetch<CartData>(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),

  removeItem: (productId: string) =>
    apiFetch<CartData>(`/cart/items/${productId}`, { method: 'DELETE' }),

  applyCoupon: (code: string) =>
    apiFetch<CartData>('/cart/coupon', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  removeCoupon: () =>
    apiFetch<CartData>('/cart/coupon', { method: 'DELETE' }),
};
```

- [ ] **Step 2: Create providers.tsx**

Create `lishop-frontend/apps/mfe-cart/src/app/providers.tsx`:
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 3: Update layout.tsx**

Read `lishop-frontend/apps/mfe-cart/src/app/layout.tsx` and replace with:
```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Giỏ hàng — Lishop',
  description: 'Xem và quản lý giỏ hàng của bạn',
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-cart tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-cart/src/lib/ lishop-frontend/apps/mfe-cart/src/app/providers.tsx lishop-frontend/apps/mfe-cart/src/app/layout.tsx
git commit -m "feat: add mfe-cart API client, providers, and layout"
```

---

## Task 9: mfe-cart — Cart Page

**Files:**
- Modify: `lishop-frontend/apps/mfe-cart/src/app/cart/page.tsx`

- [ ] **Step 1: Replace cart/page.tsx**

Read the current `lishop-frontend/apps/mfe-cart/src/app/cart/page.tsx` and replace with:
```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import { cartApi, CartItemData } from '../../lib/cart-api';

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  isPending,
}: {
  item: CartItemData;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300 text-xs">No img</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`http://localhost:3002/products/${item.productSlug}`}
          className="block text-sm font-medium text-gray-900 hover:text-indigo-600 line-clamp-2"
        >
          {item.productName}
        </Link>
        <p className="mt-1 text-sm font-bold text-indigo-600">{formatVND(item.priceVnd)}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          disabled={isPending || item.quantity <= 1}
          onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
          className="h-7 w-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center text-lg leading-none"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
        <button
          disabled={isPending || item.quantity >= item.stock}
          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
          className="h-7 w-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center text-lg leading-none"
        >
          +
        </button>
      </div>

      <div className="text-right shrink-0 w-28">
        <p className="text-sm font-bold text-gray-900">{formatVND(item.priceVnd * item.quantity)}</p>
        <button
          disabled={isPending}
          onClick={() => onRemove(item.productId)}
          className="mt-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}

export default function CartPage() {
  const qc = useQueryClient();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.getCart(),
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartApi.updateItem(productId, quantity),
    onSuccess: (data) => qc.setQueryData(['cart'], data),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => cartApi.removeItem(productId),
    onSuccess: (data) => qc.setQueryData(['cart'], data),
  });

  const couponMutation = useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: (data) => {
      qc.setQueryData(['cart'], data);
      setCouponError('');
      setCouponInput('');
    },
    onError: (err: Error) => setCouponError(err.message),
  });

  const removeCouponMutation = useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (data) => qc.setQueryData(['cart'], data),
  });

  const isPending =
    updateMutation.isPending || removeMutation.isPending ||
    couponMutation.isPending || removeCouponMutation.isPending;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-gray-400">
        Đang tải giỏ hàng...
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-xl text-gray-500">Giỏ hàng của bạn đang trống</p>
        <Link
          href="http://localhost:3002/products"
          className="mt-4 inline-block rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Giỏ hàng ({cart.items.length} sản phẩm)</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            {cart.items.map((item) => (
              <CartItemRow
                key={item.productId}
                item={item}
                onUpdateQuantity={(pid, qty) => updateMutation.mutate({ productId: pid, quantity: qty })}
                onRemove={(pid) => removeMutation.mutate(pid)}
                isPending={isPending}
              />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          {/* Coupon */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Mã giảm giá</h2>
            {cart.couponCode ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-green-700">{cart.couponCode}</span>
                  <span className="ml-2 text-xs text-green-600">
                    − {formatVND(cart.discountVnd)}
                  </span>
                </div>
                <button
                  onClick={() => removeCouponMutation.mutate()}
                  disabled={isPending}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                >
                  Xóa
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                  placeholder="Nhập mã giảm giá"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
                <button
                  disabled={isPending || !couponInput.trim()}
                  onClick={() => couponMutation.mutate(couponInput.trim())}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Áp dụng
                </button>
              </div>
            )}
            {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
          </div>

          {/* Order total */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Tóm tắt đơn hàng</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{formatVND(cart.subtotalVnd)}</span>
              </div>
              {cart.discountVnd > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>− {formatVND(cart.discountVnd)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
                <span>Tổng cộng</span>
                <span className="text-indigo-600">{formatVND(cart.totalVnd)}</span>
              </div>
            </div>
            <Link
              href="http://localhost:3005/checkout"
              className="mt-4 block w-full rounded-md bg-indigo-600 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Tiến hành thanh toán
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-cart tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-cart/src/app/cart/page.tsx
git commit -m "feat: add mfe-cart full cart page with quantities, coupon, and totals"
```

---

## Task 10: Wire add-to-cart button in mfe-catalog product detail

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx`

The current product detail page has a disabled button with no action. Wire it to call the cart API.

- [ ] **Step 1: Create cart helper in mfe-catalog**

Create `lishop-frontend/apps/mfe-catalog/src/lib/cart-helper.ts`:
```typescript
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function addToCart(productId: string, quantity: number): Promise<void> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('lishop_at') : null;
  if (!token) {
    window.location.href = 'http://localhost:3001/login';
    return;
  }
  const res = await fetch(`${API_URL}/cart/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, quantity }),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message ?? 'Failed to add to cart');
  }
}
```

- [ ] **Step 2: Update product detail page to use addToCart**

Read `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx` and update the component to:
1. Add `import { useState } from 'react';` (already imported)
2. Add `import { addToCart } from '../../../lib/cart-helper';`
3. Add state: `const [addingToCart, setAddingToCart] = useState(false);` and `const [cartMessage, setCartMessage] = useState('');`
4. Add handler:
```typescript
async function handleAddToCart() {
  setAddingToCart(true);
  setCartMessage('');
  try {
    await addToCart(product.id, 1);
    setCartMessage('Đã thêm vào giỏ hàng!');
    setTimeout(() => setCartMessage(''), 3000);
  } catch (err: unknown) {
    setCartMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra');
  } finally {
    setAddingToCart(false);
  }
}
```
5. Update the button:
```tsx
<div className="mt-6">
  <button
    disabled={product.stock === 0 || addingToCart}
    onClick={handleAddToCart}
    className="w-full rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {addingToCart ? 'Đang thêm...' : product.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
  </button>
  {cartMessage && (
    <p className={`mt-2 text-sm text-center ${cartMessage.includes('Đã') ? 'text-green-600' : 'text-red-600'}`}>
      {cartMessage}
    </p>
  )}
</div>
```

- [ ] **Step 3: Type-check mfe-catalog**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-catalog tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-catalog/src/lib/cart-helper.ts lishop-frontend/apps/mfe-catalog/src/app/products/
git commit -m "feat: wire add-to-cart button in mfe-catalog product detail page"
```

---

## Task 11: mfe-promotions — API client + components

**Files:**
- Create: `lishop-frontend/apps/mfe-promotions/src/lib/promotions-api.ts`
- Create: `lishop-frontend/apps/mfe-promotions/src/components/flash-sale-banner.tsx`
- Create: `lishop-frontend/apps/mfe-promotions/src/components/coupon-widget.tsx`

- [ ] **Step 1: Create promotions-api.ts**

Create `lishop-frontend/apps/mfe-promotions/src/lib/promotions-api.ts`:
```typescript
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export interface FlashSaleProductInfo {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  images: { url: string }[];
}

export interface FlashSaleItemInfo {
  id: string;
  discountPercent: number;
  product: FlashSaleProductInfo;
}

export interface FlashSaleInfo {
  id: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  items: FlashSaleItemInfo[];
}

export const promotionsApi = {
  getActiveFlashSales: () => apiFetch<FlashSaleInfo[]>('/promotions/flash-sales/active'),
};
```

- [ ] **Step 2: Create flash-sale-banner.tsx**

Create `lishop-frontend/apps/mfe-promotions/src/components/flash-sale-banner.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import type { FlashSaleInfo } from '../lib/promotions-api';

function useCountdown(endAt: string) {
  const getRemaining = () => Math.max(0, Math.floor((new Date(endAt).getTime() - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(getRemaining);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds(getRemaining()), 1000);
    return () => clearInterval(timer);
  }, [endAt]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { h, m, s, expired: seconds <= 0 };
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="rounded bg-red-600 px-2 py-1 text-lg font-bold text-white tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-xs text-gray-500">{label}</span>
    </div>
  );
}

export function FlashSaleBanner({ sale }: { sale: FlashSaleInfo }) {
  const { h, m, s, expired } = useCountdown(sale.endAt);

  if (expired) return null;

  return (
    <div className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">⚡ Flash Sale</h3>
          <p className="text-sm text-red-100">Kết thúc sau</p>
        </div>
        <div className="flex items-end gap-1.5">
          <TimeBlock value={h} label="giờ" />
          <span className="mb-3 text-xl font-bold">:</span>
          <TimeBlock value={m} label="phút" />
          <span className="mb-3 text-xl font-bold">:</span>
          <TimeBlock value={s} label="giây" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sale.items.map((item) => {
          const image = item.product.images[0];
          const salePrice = Math.floor(item.product.priceVnd * (1 - item.discountPercent / 100));
          return (
            <Link
              key={item.id}
              href={`http://localhost:3002/products/${item.product.slug}`}
              className="group rounded-lg bg-white/10 p-2 transition-colors hover:bg-white/20"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-white/20">
                {image ? (
                  <Image src={image.url} alt={item.product.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/50 text-xs">No img</div>
                )}
                <span className="absolute top-1 right-1 rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold">
                  -{item.discountPercent}%
                </span>
              </div>
              <p className="mt-1.5 line-clamp-1 text-xs font-medium text-white">{item.product.name}</p>
              <p className="text-xs font-bold text-yellow-300">{formatVND(salePrice)}</p>
              <p className="text-xs text-red-200 line-through">{formatVND(item.product.priceVnd)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create coupon-widget.tsx**

Create `lishop-frontend/apps/mfe-promotions/src/components/coupon-widget.tsx`:
```typescript
'use client';

import { useState } from 'react';

async function validateAndApplyCoupon(code: string): Promise<string> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('lishop_at') : null;
  if (!token) return 'Vui lòng đăng nhập để sử dụng mã giảm giá';

  const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
  const res = await fetch(`${API_URL}/cart/coupon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });
  const json = await res.json();
  if (!res.ok) return json.message ?? 'Mã giảm giá không hợp lệ';
  return 'success';
}

export function CouponWidget() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleApply() {
    if (!code.trim()) return;
    setStatus('loading');
    setMessage('');
    const result = await validateAndApplyCoupon(code.trim().toUpperCase());
    if (result === 'success') {
      setStatus('success');
      setMessage(`Mã "${code.toUpperCase()}" đã được áp dụng vào giỏ hàng!`);
      setCode('');
    } else {
      setStatus('error');
      setMessage(result);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Nhập mã giảm giá</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setStatus('idle'); setMessage(''); }}
          placeholder="VD: SAVE10"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm uppercase tracking-wider focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          disabled={status === 'loading' || !code.trim()}
          onClick={handleApply}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {status === 'loading' ? '...' : 'Áp dụng'}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-xs ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
      {status === 'success' && (
        <a
          href="http://localhost:3003/cart"
          className="mt-2 block text-xs text-indigo-600 hover:underline"
        >
          Xem giỏ hàng →
        </a>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check mfe-promotions**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-promotions tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-promotions/src/lib/ lishop-frontend/apps/mfe-promotions/src/components/
git commit -m "feat: add mfe-promotions API client, flash-sale-banner, and coupon-widget"
```

---

## Task 12: mfe-promotions — Promotions Page + Layout + Providers

**Files:**
- Create: `lishop-frontend/apps/mfe-promotions/src/app/providers.tsx`
- Modify: `lishop-frontend/apps/mfe-promotions/src/app/layout.tsx`
- Modify: `lishop-frontend/apps/mfe-promotions/src/app/promotions/page.tsx`

- [ ] **Step 1: Create providers.tsx**

Create `lishop-frontend/apps/mfe-promotions/src/app/providers.tsx`:
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

- [ ] **Step 2: Update layout.tsx**

Read `lishop-frontend/apps/mfe-promotions/src/app/layout.tsx` and replace with:
```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Khuyến mãi — Lishop',
  description: 'Flash sale và mã giảm giá hấp dẫn tại Lishop',
};

export default function PromotionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Replace promotions/page.tsx**

Read `lishop-frontend/apps/mfe-promotions/src/app/promotions/page.tsx` and replace with:
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { promotionsApi } from '../../lib/promotions-api';
import { FlashSaleBanner } from '../../components/flash-sale-banner';
import { CouponWidget } from '../../components/coupon-widget';

export default function PromotionsPage() {
  const { data: flashSales = [], isLoading } = useQuery({
    queryKey: ['flash-sales-active'],
    queryFn: () => promotionsApi.getActiveFlashSales(),
    refetchInterval: 60_000, // refresh every minute
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Khuyến mãi</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {isLoading && (
            <div className="rounded-xl bg-gray-100 h-40 animate-pulse" />
          )}
          {!isLoading && flashSales.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
              <p className="text-lg">Hiện không có flash sale nào</p>
              <p className="mt-1 text-sm">Quay lại sau để xem các ưu đãi mới nhất!</p>
            </div>
          )}
          {flashSales.map((sale) => (
            <FlashSaleBanner key={sale.id} sale={sale} />
          ))}
        </div>

        <div className="space-y-4">
          <CouponWidget />

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Hướng dẫn dùng mã</h3>
            <ol className="space-y-1.5 text-xs text-gray-600 list-decimal list-inside">
              <li>Thêm sản phẩm vào giỏ hàng</li>
              <li>Nhập mã giảm giá ở trên hoặc tại trang giỏ hàng</li>
              <li>Giảm giá được áp dụng tự động khi thanh toán</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-promotions tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-promotions/src/app/
git commit -m "feat: add mfe-promotions page with flash sale banners and coupon widget"
```

---

## Self-Review: Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| CartItem CRUD (add/update/remove) via Prisma | Task 5 (CartRepository) |
| Cart totals computed from items | Task 6 (CartService.buildCart) |
| Coupon stored in Redis (TTL 24h) | Task 6 (CartService.applyCoupon) |
| GET /cart (auth required) | Task 7 (CartController) |
| POST /cart/items (auth required) | Task 7 |
| PATCH /cart/items/:productId (auth required) | Task 7 |
| DELETE /cart/items/:productId (auth required) | Task 7 |
| POST /cart/coupon (auth required) | Task 7 |
| DELETE /cart/coupon (auth required) | Task 7 |
| Coupon validation: isActive, expiresAt, maxUses, minOrderVnd, hasUsed | Task 2 (CouponsService) |
| Discount: PERCENT, FIXED (capped), FREE_SHIPPING (0) | Task 2 |
| Flash sales: findActive (now between startAt/endAt) | Task 3 |
| GET /promotions/flash-sales/active (@Public()) | Task 4 |
| mfe-cart: cart page with quantities, remove, subtotal, discount, total | Task 9 |
| mfe-cart: coupon apply/remove UI | Task 9 |
| mfe-catalog: add-to-cart wired to backend | Task 10 |
| mfe-promotions: flash sale banners with countdown | Task 11 |
| mfe-promotions: coupon widget | Task 11 |
| mfe-promotions: promotions page | Task 12 |

All spec requirements covered. ✓

---

## Remaining Plans (After Plan 4)

- **Plan 5 — Checkout + Orders**: OrdersModule (create order from cart, COD payment), mfe-checkout (address, order summary, place order), mfe-orders (order history, order detail)
- **Plan 6 — Profile + Reviews**: ProfileModule (address CRUD, loyalty points), ReviewsModule (create/list reviews), mfe-profile, product reviews in mfe-catalog
- **Plan 7 — Admin**: AdminModule (product/order/user management), mfe-admin (dashboard, CRUD tables)
- **Plan 8 — Notifications**: NotificationsModule, mfe-notifications (notification center)

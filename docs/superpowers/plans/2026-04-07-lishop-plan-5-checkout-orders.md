# Plan 5 — Checkout + Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement checkout (place order from cart with COD payment) and order management (list, detail), plus mfe-checkout and mfe-orders frontend apps.

**Architecture:** Backend adds `AddressesModule` (user saved addresses), `OrdersModule` (placeOrder atomically creates Order + OrderItems + Payment in one Prisma transaction, then clears cart). Cart is cleared via a new public `clearCart()` method on CartService. COD is the only payment method in Plan 5. Frontend mfe-checkout fetches cart + addresses, lets user pick/create address, then POSTs to /orders. mfe-orders shows order history and detail. Both read `localStorage.getItem('lishop_at')` for Bearer auth.

**Tech Stack:** NestJS 10 + Fastify, Prisma 5, Next.js 15 App Router, TanStack Query v5, `@lishop/shared` (formatVND)

---

## File Map

### Backend — new files
```
apps/api/src/modules/
  addresses/
    addresses.repository.ts      — Prisma CRUD for Address
    addresses.service.ts         — CRUD + setDefault logic
    addresses.service.spec.ts
    addresses.controller.ts      — GET/POST/PATCH/DELETE /addresses
    addresses.module.ts
    dto/
      create-address.dto.ts
      update-address.dto.ts
  orders/
    orders.repository.ts         — createOrder (transaction), findByUserId, findByIdAndUserId
    orders.service.ts            — placeOrder, findMyOrders, findMyOrder
    orders.service.spec.ts
    orders.controller.ts         — POST /orders, GET /orders, GET /orders/:id
    orders.module.ts
    dto/
      place-order.dto.ts
```

### Backend — modified files
```
apps/api/src/modules/cart/cart.service.ts  — add public clearCart(userId)
apps/api/src/app.module.ts                 — add AddressesModule + OrdersModule
```

### Frontend mfe-checkout — new/modified files
```
apps/mfe-checkout/src/
  lib/
    checkout-api.ts    — typed fetch for /cart, /addresses, /orders
  app/
    providers.tsx
    layout.tsx         — update with Providers + metadata
    checkout/page.tsx  — address picker + order summary + place order
```

### Frontend mfe-orders — new/modified files
```
apps/mfe-orders/src/
  lib/
    orders-api.ts      — typed fetch for /orders
  app/
    providers.tsx
    layout.tsx         — update with Providers + metadata
    orders/page.tsx    — order list with status badges
    orders/[id]/page.tsx  — order detail (items, payment, address, timeline)
```

---

## Task 1: Add clearCart to CartService

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/cart/cart.service.ts`

- [ ] **Step 1: Add clearCart method**

Read `lishop-backend/apps/api/src/modules/cart/cart.service.ts`.

After the `removeCoupon` method, add:
```typescript
async clearCart(userId: string): Promise<void> {
  await this.repo.clear(userId);
  await this.redis.del(`cart:coupon:${userId}`);
}
```

- [ ] **Step 2: Run existing tests to ensure nothing broke**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=cart.service.spec --no-coverage 2>&1 | tail -5
```
Expected: all existing tests still pass.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/cart/cart.service.ts
git commit -m "feat: expose clearCart on CartService for post-order cleanup"
```

---

## Task 2: AddressesModule

**Files:**
- Create: `lishop-backend/apps/api/src/modules/addresses/dto/create-address.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/addresses/dto/update-address.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/addresses/addresses.repository.ts`
- Create: `lishop-backend/apps/api/src/modules/addresses/addresses.service.ts`
- Create: `lishop-backend/apps/api/src/modules/addresses/addresses.service.spec.ts`
- Create: `lishop-backend/apps/api/src/modules/addresses/addresses.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/addresses/addresses.module.ts`
- Modify: `lishop-backend/apps/api/src/app.module.ts`

- [ ] **Step 1: Create DTOs**

Create `lishop-backend/apps/api/src/modules/addresses/dto/create-address.dto.ts`:
```typescript
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) fullName!: string;
  @ApiProperty() @IsString() @MinLength(7) @MaxLength(20) phone!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255) street!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) district!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) city!: string;
  @ApiPropertyOptional({ default: 'VN' }) @IsOptional() @IsString() country: string = 'VN';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}
```

Create `lishop-backend/apps/api/src/modules/addresses/dto/update-address.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateAddressDto } from './create-address.dto';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
```

- [ ] **Step 2: Create addresses.repository.ts**

Create `lishop-backend/apps/api/src/modules/addresses/addresses.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma, Address, Prisma } from '@lishop/database';

@Injectable()
export class AddressesRepository {
  findByUserId(userId: string): Promise<Address[]> {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  findById(id: string): Promise<Address | null> {
    return prisma.address.findUnique({ where: { id } });
  }

  create(data: Prisma.AddressCreateInput): Promise<Address> {
    return prisma.address.create({ data });
  }

  update(id: string, data: Prisma.AddressUpdateInput): Promise<Address> {
    return prisma.address.update({ where: { id }, data });
  }

  delete(id: string): Promise<Address> {
    return prisma.address.delete({ where: { id } });
  }

  async setDefault(userId: string, addressId: string): Promise<void> {
    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
      prisma.address.update({ where: { id: addressId }, data: { isDefault: true } }),
    ]);
  }
}
```

- [ ] **Step 3: Create addresses.service.spec.ts**

Create `lishop-backend/apps/api/src/modules/addresses/addresses.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { AddressesRepository } from './addresses.repository';

const makeAddr = (overrides: Partial<any> = {}): any => ({
  id: 'a1',
  userId: 'u1',
  fullName: 'Nguyen Van A',
  phone: '0901234567',
  street: '123 Main St',
  district: 'District 1',
  city: 'Ho Chi Minh',
  country: 'VN',
  isDefault: false,
  createdAt: new Date(),
  ...overrides,
});

describe('AddressesService', () => {
  let service: AddressesService;
  const repo = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    setDefault: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AddressesService, { provide: AddressesRepository, useValue: repo }],
    }).compile();
    service = module.get(AddressesService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getAddresses returns addresses for user', async () => {
    repo.findByUserId.mockResolvedValue([makeAddr()]);
    const result = await service.getAddresses('u1');
    expect(result).toHaveLength(1);
  });

  it('createAddress creates with userId', async () => {
    repo.create.mockResolvedValue(makeAddr());
    await service.createAddress('u1', { fullName: 'A', phone: '0901234567', street: 'B', district: 'C', city: 'D' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: { connect: { id: 'u1' } } }));
  });

  it('updateAddress throws NotFoundException when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.updateAddress('u1', 'a99', {})).rejects.toThrow(NotFoundException);
  });

  it('updateAddress throws ForbiddenException when address belongs to another user', async () => {
    repo.findById.mockResolvedValue(makeAddr({ userId: 'u2' }));
    await expect(service.updateAddress('u1', 'a1', {})).rejects.toThrow(ForbiddenException);
  });

  it('deleteAddress throws NotFoundException when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.deleteAddress('u1', 'a99')).rejects.toThrow(NotFoundException);
  });

  it('setDefault calls repo.setDefault', async () => {
    repo.findById.mockResolvedValue(makeAddr());
    repo.setDefault.mockResolvedValue(undefined);
    await service.setDefault('u1', 'a1');
    expect(repo.setDefault).toHaveBeenCalledWith('u1', 'a1');
  });
});
```

- [ ] **Step 4: Create addresses.service.ts**

Create `lishop-backend/apps/api/src/modules/addresses/addresses.service.ts`:
```typescript
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AddressesRepository } from './addresses.repository';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from '@lishop/database';

@Injectable()
export class AddressesService {
  constructor(private readonly repo: AddressesRepository) {}

  getAddresses(userId: string): Promise<Address[]> {
    return this.repo.findByUserId(userId);
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    return this.repo.create({
      ...dto,
      userId: { connect: { id: userId } },
    } as any);
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<Address> {
    const existing = await this.repo.findById(addressId);
    if (!existing) throw new NotFoundException('Địa chỉ không tồn tại');
    if (existing.userId !== userId) throw new ForbiddenException('Không có quyền sửa địa chỉ này');
    return this.repo.update(addressId, dto);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const existing = await this.repo.findById(addressId);
    if (!existing) throw new NotFoundException('Địa chỉ không tồn tại');
    if (existing.userId !== userId) throw new ForbiddenException('Không có quyền xóa địa chỉ này');
    await this.repo.delete(addressId);
  }

  async setDefault(userId: string, addressId: string): Promise<void> {
    const existing = await this.repo.findById(addressId);
    if (!existing) throw new NotFoundException('Địa chỉ không tồn tại');
    if (existing.userId !== userId) throw new ForbiddenException('Không có quyền thay đổi địa chỉ này');
    await this.repo.setDefault(userId, addressId);
  }
}
```

- [ ] **Step 5: Run tests**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=addresses.service.spec --no-coverage 2>&1 | tail -10
```
Expected: PASS (6 tests).

- [ ] **Step 6: Create addresses.controller.ts**

Create `lishop-backend/apps/api/src/modules/addresses/addresses.controller.ts`:
```typescript
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user addresses' })
  async getAll(@CurrentUser('id') userId: string) {
    return this.addressesService.getAddresses(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) {
    return this.addressesService.createAddress(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an address' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.updateAddress(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  async remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.addressesService.deleteAddress(userId, id);
  }

  @Patch(':id/default')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set address as default' })
  async setDefault(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.addressesService.setDefault(userId, id);
  }
}
```

- [ ] **Step 7: Create addresses.module.ts**

Create `lishop-backend/apps/api/src/modules/addresses/addresses.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AddressesRepository } from './addresses.repository';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';

@Module({
  providers: [AddressesRepository, AddressesService],
  controllers: [AddressesController],
  exports: [AddressesService, AddressesRepository],
})
export class AddressesModule {}
```

- [ ] **Step 8: Add AddressesModule to AppModule**

Read `lishop-backend/apps/api/src/app.module.ts`. Add:
```typescript
import { AddressesModule } from './modules/addresses/addresses.module';
```
And add `AddressesModule` to the `imports` array (after CartModule).

- [ ] **Step 9: Type-check and run all tests**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -20 && pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -10
```
Expected: 0 errors, all tests pass.

- [ ] **Step 10: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/addresses/
git commit -m "feat: add AddressesModule with CRUD and default-address support"
```

---

## Task 3: OrdersRepository

**Files:**
- Create: `lishop-backend/apps/api/src/modules/orders/orders.repository.ts`
- Create: `lishop-backend/apps/api/src/modules/orders/dto/place-order.dto.ts`

- [ ] **Step 1: Create place-order.dto.ts**

Create `lishop-backend/apps/api/src/modules/orders/dto/place-order.dto.ts`:
```typescript
import { IsUUID, IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@lishop/database';

export class PlaceOrderDto {
  @ApiProperty() @IsUUID() addressId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.COD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.COD;
}
```

- [ ] **Step 2: Create orders.repository.ts**

Create `lishop-backend/apps/api/src/modules/orders/orders.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma, Order, OrderStatus, PaymentMethod, PaymentStatus } from '@lishop/database';

export interface OrderItemInput {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceVnd: number;
  totalPriceVnd: number;
}

export interface CreateOrderInput {
  userId: string;
  addressId: string;
  subtotalVnd: number;
  shippingFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  notes?: string;
  paymentMethod: PaymentMethod;
  items: OrderItemInput[];
}

export interface OrderWithDetails {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotalVnd: number;
  shippingFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  notes: string | null;
  trackingNumber: string | null;
  createdAt: Date;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPriceVnd: number;
    totalPriceVnd: number;
  }[];
  address: {
    fullName: string;
    phone: string;
    street: string;
    district: string;
    city: string;
    country: string;
  };
  payment: {
    id: string;
    method: string;
    amountVnd: number;
    status: string;
  } | null;
}

const ORDER_INCLUDE = {
  items: true,
  address: {
    select: {
      fullName: true,
      phone: true,
      street: true,
      district: true,
      city: true,
      country: true,
    },
  },
  payment: {
    select: { id: true, method: true, amountVnd: true, status: true },
  },
};

@Injectable()
export class OrdersRepository {
  async create(input: CreateOrderInput): Promise<OrderWithDetails> {
    const orderNumber = `LS-${Date.now()}`;
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: input.userId,
          addressId: input.addressId,
          status: OrderStatus.PENDING,
          subtotalVnd: input.subtotalVnd,
          shippingFeeVnd: input.shippingFeeVnd,
          discountVnd: input.discountVnd,
          totalVnd: input.totalVnd,
          notes: input.notes ?? null,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPriceVnd: item.unitPriceVnd,
              totalPriceVnd: item.totalPriceVnd,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: input.paymentMethod,
          amountVnd: input.totalVnd,
          status: PaymentStatus.PENDING,
        },
      });
      return prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: ORDER_INCLUDE,
      }) as Promise<OrderWithDetails>;
    });
  }

  findByUserId(userId: string): Promise<OrderWithDetails[]> {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
    }) as Promise<OrderWithDetails[]>;
  }

  findByIdAndUserId(id: string, userId: string): Promise<OrderWithDetails | null> {
    return prisma.order.findFirst({
      where: { id, userId },
      include: ORDER_INCLUDE,
    }) as Promise<OrderWithDetails | null>;
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
git add lishop-backend/apps/api/src/modules/orders/
git commit -m "feat: add OrdersRepository with transactional order creation"
```

---

## Task 4: OrdersService + spec

**Files:**
- Create: `lishop-backend/apps/api/src/modules/orders/orders.service.ts`
- Create: `lishop-backend/apps/api/src/modules/orders/orders.service.spec.ts`

- [ ] **Step 1: Create orders.service.spec.ts**

Create `lishop-backend/apps/api/src/modules/orders/orders.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { AddressesRepository } from '../addresses/addresses.repository';
import { CartService } from '../cart/cart.service';
import { PaymentMethod, OrderStatus } from '@lishop/database';

const mockCart = {
  items: [
    { productId: 'p1', productName: 'iPhone 15', quantity: 2, priceVnd: 20000000, priceUsd: 800, stock: 5, productSlug: 'iphone-15', id: 'ci1', imageUrl: null },
  ],
  subtotalVnd: 40000000,
  subtotalUsd: 1600,
  couponCode: null,
  discountVnd: 0,
  totalVnd: 40000000,
};

const mockAddress = {
  id: 'addr1',
  userId: 'u1',
  fullName: 'Nguyen Van A',
  phone: '0901234567',
  street: '123 Main',
  district: 'Q1',
  city: 'HCM',
  country: 'VN',
  isDefault: true,
  createdAt: new Date(),
};

const mockOrder = {
  id: 'order1',
  orderNumber: 'LS-123456',
  status: OrderStatus.PENDING,
  subtotalVnd: 40000000,
  shippingFeeVnd: 30000,
  discountVnd: 0,
  totalVnd: 40030000,
  notes: null,
  trackingNumber: null,
  createdAt: new Date(),
  items: [],
  address: { fullName: 'A', phone: '09', street: 'B', district: 'C', city: 'D', country: 'VN' },
  payment: { id: 'pay1', method: 'COD', amountVnd: 40030000, status: 'PENDING' },
};

describe('OrdersService', () => {
  let service: OrdersService;
  const repo = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    findByIdAndUserId: jest.fn(),
  };
  const addressRepo = { findById: jest.fn() };
  const cartService = { getCart: jest.fn(), clearCart: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: repo },
        { provide: AddressesRepository, useValue: addressRepo },
        { provide: CartService, useValue: cartService },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  afterEach(() => jest.resetAllMocks());

  it('placeOrder throws BadRequestException when cart is empty', async () => {
    cartService.getCart.mockResolvedValue({ ...mockCart, items: [], subtotalVnd: 0, totalVnd: 0 });
    await expect(service.placeOrder('u1', { addressId: 'addr1', paymentMethod: PaymentMethod.COD })).rejects.toThrow(BadRequestException);
  });

  it('placeOrder throws NotFoundException when address not found', async () => {
    cartService.getCart.mockResolvedValue(mockCart);
    addressRepo.findById.mockResolvedValue(null);
    await expect(service.placeOrder('u1', { addressId: 'addr99', paymentMethod: PaymentMethod.COD })).rejects.toThrow(NotFoundException);
  });

  it('placeOrder throws NotFoundException when address belongs to another user', async () => {
    cartService.getCart.mockResolvedValue(mockCart);
    addressRepo.findById.mockResolvedValue({ ...mockAddress, userId: 'u2' });
    await expect(service.placeOrder('u1', { addressId: 'addr1', paymentMethod: PaymentMethod.COD })).rejects.toThrow(NotFoundException);
  });

  it('placeOrder creates order and clears cart', async () => {
    cartService.getCart.mockResolvedValue(mockCart);
    addressRepo.findById.mockResolvedValue(mockAddress);
    repo.create.mockResolvedValue(mockOrder);
    cartService.clearCart.mockResolvedValue(undefined);

    const result = await service.placeOrder('u1', { addressId: 'addr1', paymentMethod: PaymentMethod.COD });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1',
      addressId: 'addr1',
      subtotalVnd: 40000000,
      shippingFeeVnd: 30000,
      discountVnd: 0,
    }));
    expect(cartService.clearCart).toHaveBeenCalledWith('u1');
    expect(result.orderNumber).toBe('LS-123456');
  });

  it('findMyOrders returns orders for user', async () => {
    repo.findByUserId.mockResolvedValue([mockOrder]);
    const result = await service.findMyOrders('u1');
    expect(result).toHaveLength(1);
  });

  it('findMyOrder throws NotFoundException when order not found', async () => {
    repo.findByIdAndUserId.mockResolvedValue(null);
    await expect(service.findMyOrder('u1', 'order99')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=orders.service.spec --no-coverage 2>&1 | tail -5
```
Expected: FAIL (OrdersService not found).

- [ ] **Step 3: Create orders.service.ts**

Create `lishop-backend/apps/api/src/modules/orders/orders.service.ts`:
```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository, OrderWithDetails } from './orders.repository';
import { AddressesRepository } from '../addresses/addresses.repository';
import { CartService } from '../cart/cart.service';
import { PlaceOrderDto } from './dto/place-order.dto';

const SHIPPING_FEE_VND = 30000;

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly addressRepo: AddressesRepository,
    private readonly cartService: CartService,
  ) {}

  async placeOrder(userId: string, dto: PlaceOrderDto): Promise<OrderWithDetails> {
    const cart = await this.cartService.getCart(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    const address = await this.addressRepo.findById(dto.addressId);
    if (!address || address.userId !== userId) {
      throw new NotFoundException('Địa chỉ không tồn tại');
    }

    const subtotalVnd = cart.subtotalVnd;
    const discountVnd = cart.discountVnd;
    const shippingFeeVnd = SHIPPING_FEE_VND;
    const totalVnd = subtotalVnd + shippingFeeVnd - discountVnd;

    const order = await this.repo.create({
      userId,
      addressId: dto.addressId,
      subtotalVnd,
      shippingFeeVnd,
      discountVnd,
      totalVnd,
      notes: dto.notes,
      paymentMethod: dto.paymentMethod,
      items: cart.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPriceVnd: item.priceVnd,
        totalPriceVnd: item.priceVnd * item.quantity,
      })),
    });

    await this.cartService.clearCart(userId);
    return order;
  }

  findMyOrders(userId: string): Promise<OrderWithDetails[]> {
    return this.repo.findByUserId(userId);
  }

  async findMyOrder(userId: string, orderId: string): Promise<OrderWithDetails> {
    const order = await this.repo.findByIdAndUserId(orderId, userId);
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    return order;
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=orders.service.spec --no-coverage 2>&1 | tail -10
```
Expected: 6 tests PASS. Fix any failures.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/orders/orders.service.ts lishop-backend/apps/api/src/modules/orders/orders.service.spec.ts
git commit -m "feat: add OrdersService with placeOrder, COD payment, cart clearing (TDD)"
```

---

## Task 5: OrdersController + OrdersModule + AppModule wire

**Files:**
- Create: `lishop-backend/apps/api/src/modules/orders/orders.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/orders/orders.module.ts`
- Modify: `lishop-backend/apps/api/src/app.module.ts`

- [ ] **Step 1: Create orders.controller.ts**

Create `lishop-backend/apps/api/src/modules/orders/orders.controller.ts`:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a new order from cart' })
  async placeOrder(@CurrentUser('id') userId: string, @Body() dto: PlaceOrderDto) {
    return this.ordersService.placeOrder(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user orders' })
  async getMyOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.findMyOrders(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific order' })
  async getOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findMyOrder(userId, id);
  }
}
```

- [ ] **Step 2: Create orders.module.ts**

Create `lishop-backend/apps/api/src/modules/orders/orders.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AddressesModule } from '../addresses/addresses.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [AddressesModule, CartModule],
  providers: [OrdersRepository, OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
```

- [ ] **Step 3: Update app.module.ts**

Read `lishop-backend/apps/api/src/app.module.ts` and add `OrdersModule`:
```typescript
import { OrdersModule } from './modules/orders/orders.module';
```
Add `OrdersModule` to the `imports` array (after AddressesModule).

- [ ] **Step 4: Type-check and run all tests**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -20 && pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -10
```
Expected: 0 type errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/orders/orders.controller.ts lishop-backend/apps/api/src/modules/orders/orders.module.ts lishop-backend/apps/api/src/app.module.ts
git commit -m "feat: wire OrdersModule into AppModule with checkout and order history endpoints"
```

---

## Task 6: mfe-checkout — API client + providers + layout

**Files:**
- Create: `lishop-frontend/apps/mfe-checkout/src/lib/checkout-api.ts`
- Create: `lishop-frontend/apps/mfe-checkout/src/app/providers.tsx`
- Modify: `lishop-frontend/apps/mfe-checkout/src/app/layout.tsx`

- [ ] **Step 1: Create checkout-api.ts**

Create `lishop-frontend/apps/mfe-checkout/src/lib/checkout-api.ts`:
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

export interface CartItemInfo {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  quantity: number;
  priceVnd: number;
  stock: number;
}

export interface CartInfo {
  items: CartItemInfo[];
  subtotalVnd: number;
  discountVnd: number;
  totalVnd: number;
  couponCode: string | null;
}

export interface AddressInfo {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  country: string;
  isDefault: boolean;
}

export interface CreateAddressInput {
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  country?: string;
}

export interface OrderResult {
  id: string;
  orderNumber: string;
  status: string;
  subtotalVnd: number;
  shippingFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  createdAt: string;
}

export const checkoutApi = {
  getCart: () => apiFetch<CartInfo>('/cart'),

  getAddresses: () => apiFetch<AddressInfo[]>('/addresses'),

  createAddress: (data: CreateAddressInput) =>
    apiFetch<AddressInfo>('/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  placeOrder: (addressId: string, paymentMethod = 'COD', notes?: string) =>
    apiFetch<OrderResult>('/orders', {
      method: 'POST',
      body: JSON.stringify({ addressId, paymentMethod, notes }),
    }),
};
```

- [ ] **Step 2: Create providers.tsx**

Create `lishop-frontend/apps/mfe-checkout/src/app/providers.tsx`:
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1 } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 3: Update layout.tsx**

Read `lishop-frontend/apps/mfe-checkout/src/app/layout.tsx` and replace:
```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Thanh toán — Lishop',
  description: 'Hoàn tất đơn hàng của bạn',
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
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
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-checkout tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-checkout/src/lib/ lishop-frontend/apps/mfe-checkout/src/app/providers.tsx lishop-frontend/apps/mfe-checkout/src/app/layout.tsx
git commit -m "feat: add mfe-checkout API client, providers, and layout"
```

---

## Task 7: mfe-checkout — Checkout Page

**Files:**
- Modify: `lishop-frontend/apps/mfe-checkout/src/app/checkout/page.tsx`

- [ ] **Step 1: Replace checkout/page.tsx**

Read `lishop-frontend/apps/mfe-checkout/src/app/checkout/page.tsx` and replace:

```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { checkoutApi, AddressInfo, CreateAddressInput } from '../../lib/checkout-api';

const SHIPPING_FEE = 30000;

function AddressCard({
  address,
  selected,
  onSelect,
}: {
  address: AddressInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border-2 p-3 transition-colors ${
        selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {address.fullName}
            {address.isDefault && (
              <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
                Mặc định
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{address.phone}</p>
          <p className="text-xs text-gray-600 mt-1">
            {address.street}, {address.district}, {address.city}
          </p>
        </div>
        {selected && (
          <span className="text-indigo-600 text-lg">✓</span>
        )}
      </div>
    </button>
  );
}

function NewAddressForm({ onSave }: { onSave: (data: CreateAddressInput) => void }) {
  const [form, setForm] = useState<CreateAddressInput>({
    fullName: '', phone: '', street: '', district: '', city: '', country: 'VN',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  const field = (key: keyof CreateAddressInput, label: string, placeholder: string) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        required
        value={form[key] ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg border border-dashed border-gray-300 p-3">
      <p className="text-xs font-semibold text-gray-700">Địa chỉ mới</p>
      {field('fullName', 'Họ tên', 'Nguyễn Văn A')}
      {field('phone', 'Số điện thoại', '0901234567')}
      {field('street', 'Địa chỉ', '123 Đường ABC')}
      {field('district', 'Quận/Huyện', 'Quận 1')}
      {field('city', 'Tỉnh/Thành phố', 'Hồ Chí Minh')}
      <button
        type="submit"
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
      >
        Lưu địa chỉ
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ['checkout-cart'],
    queryFn: () => checkoutApi.getCart(),
  });

  const { data: addresses = [], refetch: refetchAddresses } = useQuery({
    queryKey: ['checkout-addresses'],
    queryFn: () => checkoutApi.getAddresses(),
    onSuccess: (data: AddressInfo[]) => {
      if (!selectedAddressId && data.length > 0) {
        const def = data.find((a) => a.isDefault) ?? data[0];
        setSelectedAddressId(def.id);
      }
    },
  } as any);

  const createAddressMutation = useMutation({
    mutationFn: (data: CreateAddressInput) => checkoutApi.createAddress(data),
    onSuccess: (addr) => {
      refetchAddresses();
      setSelectedAddressId(addr.id);
      setShowNewAddress(false);
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: () => {
      if (!selectedAddressId) throw new Error('Vui lòng chọn địa chỉ giao hàng');
      return checkoutApi.placeOrder(selectedAddressId, 'COD', notes || undefined);
    },
    onSuccess: (order) => {
      window.location.href = `http://localhost:3005/orders/${order.id}`;
    },
    onError: (err: Error) => setError(err.message),
  });

  if (cartLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-gray-400">Đang tải...</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-gray-500">Giỏ hàng trống. Không thể thanh toán.</p>
        <a href="http://localhost:3002/products" className="mt-4 inline-block text-indigo-600 hover:underline text-sm">
          ← Quay lại mua sắm
        </a>
      </div>
    );
  }

  const subtotal = cart.subtotalVnd;
  const discount = cart.discountVnd;
  const shipping = SHIPPING_FEE;
  const total = subtotal + shipping - discount;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Thanh toán</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: address + notes */}
        <div className="lg:col-span-3 space-y-4">
          {/* Shipping address */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Địa chỉ giao hàng</h2>
            <div className="space-y-2">
              {(addresses as AddressInfo[]).map((addr) => (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  selected={selectedAddressId === addr.id}
                  onSelect={() => setSelectedAddressId(addr.id)}
                />
              ))}
            </div>
            {!showNewAddress ? (
              <button
                onClick={() => setShowNewAddress(true)}
                className="mt-2 text-xs text-indigo-600 hover:underline"
              >
                + Thêm địa chỉ mới
              </button>
            ) : (
              <NewAddressForm onSave={(data) => createAddressMutation.mutate(data)} />
            )}
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Ghi chú đơn hàng</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú cho người giao hàng (tùy chọn)..."
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>

          {/* Payment method */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Phương thức thanh toán</h2>
            <div className="flex items-center gap-2 rounded-lg border-2 border-indigo-500 bg-indigo-50 px-3 py-2">
              <span className="text-lg">💵</span>
              <span className="text-sm font-medium text-indigo-700">Thanh toán khi nhận hàng (COD)</span>
            </div>
          </div>
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sticky top-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Đơn hàng ({cart.items.length} sản phẩm)
            </h2>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-xs text-gray-700">
                  <span className="line-clamp-1 flex-1">{item.productName} × {item.quantity}</span>
                  <span className="ml-2 shrink-0 font-medium">{formatVND(item.priceVnd * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span>{formatVND(shipping)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá {cart.couponCode && `(${cart.couponCode})`}</span>
                  <span>− {formatVND(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-bold text-gray-900">
                <span>Tổng cộng</span>
                <span className="text-indigo-600">{formatVND(total)}</span>
              </div>
            </div>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            <button
              disabled={!selectedAddressId || placeOrderMutation.isPending}
              onClick={() => { setError(''); placeOrderMutation.mutate(); }}
              className="mt-4 w-full rounded-md bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {placeOrderMutation.isPending ? 'Đang đặt hàng...' : 'Đặt hàng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-checkout tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors. If `onSuccess` in useQuery config causes type errors (TanStack Query v5 removed it from options), move the auto-select logic to a `useEffect` that watches `addresses`:
```typescript
import { useEffect } from 'react';
// ...
useEffect(() => {
  if (!selectedAddressId && addresses.length > 0) {
    const def = addresses.find((a: AddressInfo) => a.isDefault) ?? addresses[0];
    setSelectedAddressId(def.id);
  }
}, [addresses]);
```
And remove `onSuccess` from the useQuery options.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-checkout/src/app/checkout/page.tsx
git commit -m "feat: add mfe-checkout page with address picker and order placement"
```

---

## Task 8: mfe-orders — API client + providers + layout

**Files:**
- Create: `lishop-frontend/apps/mfe-orders/src/lib/orders-api.ts`
- Create: `lishop-frontend/apps/mfe-orders/src/app/providers.tsx`
- Modify: `lishop-frontend/apps/mfe-orders/src/app/layout.tsx`

- [ ] **Step 1: Create orders-api.ts**

Create `lishop-frontend/apps/mfe-orders/src/lib/orders-api.ts`:
```typescript
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('lishop_at');
}

async function apiFetch<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export interface OrderItemInfo {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceVnd: number;
  totalPriceVnd: number;
}

export interface OrderAddressInfo {
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  country: string;
}

export interface OrderPaymentInfo {
  id: string;
  method: string;
  amountVnd: number;
  status: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotalVnd: number;
  shippingFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  notes: string | null;
  trackingNumber: string | null;
  createdAt: string;
  items: OrderItemInfo[];
  address: OrderAddressInfo;
  payment: OrderPaymentInfo | null;
}

export const ordersApi = {
  getOrders: () => apiFetch<OrderSummary[]>('/orders'),
  getOrder: (id: string) => apiFetch<OrderSummary>(`/orders/${id}`),
};
```

- [ ] **Step 2: Create providers.tsx**

Create `lishop-frontend/apps/mfe-orders/src/app/providers.tsx`:
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

Read `lishop-frontend/apps/mfe-orders/src/app/layout.tsx` and replace:
```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Đơn hàng — Lishop',
  description: 'Quản lý đơn hàng của bạn',
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
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
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-orders tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-orders/src/lib/ lishop-frontend/apps/mfe-orders/src/app/providers.tsx lishop-frontend/apps/mfe-orders/src/app/layout.tsx
git commit -m "feat: add mfe-orders API client, providers, and layout"
```

---

## Task 9: mfe-orders — Orders List + Detail Pages

**Files:**
- Modify: `lishop-frontend/apps/mfe-orders/src/app/orders/page.tsx`
- Modify: `lishop-frontend/apps/mfe-orders/src/app/orders/[id]/page.tsx`

- [ ] **Step 1: Replace orders/page.tsx**

Read `lishop-frontend/apps/mfe-orders/src/app/orders/page.tsx` and replace:
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import { ordersApi, OrderStatus } from '../../lib/orders-api';

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.getOrders(),
    retry: false,
  });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-400">Đang tải...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-xl text-gray-500">Bạn chưa có đơn hàng nào</p>
        <a
          href="http://localhost:3002/products"
          className="mt-4 inline-block rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Mua sắm ngay
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`} className="block">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="mt-3 border-t pt-3">
                <p className="text-xs text-gray-600">
                  {order.items.length} sản phẩm · {order.items.slice(0, 2).map((i) => i.productName).join(', ')}
                  {order.items.length > 2 && ` +${order.items.length - 2} khác`}
                </p>
                <p className="mt-1 text-sm font-bold text-indigo-600">{formatVND(order.totalVnd)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace orders/[id]/page.tsx**

Read `lishop-frontend/apps/mfe-orders/src/app/orders/[id]/page.tsx` and replace:
```typescript
'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import { ordersApi, OrderStatus } from '../../../lib/orders-api';

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao hàng',
  DELIVERED: 'Đã giao thành công',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng',
  STRIPE: 'Stripe',
  VNPAY: 'VNPay',
  MOMO: 'Momo',
  PAYPAL: 'PayPal',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: Props) {
  const { id } = use(params);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrder(id),
    retry: false,
  });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-400">Đang tải...</div>;
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-red-600">Không tìm thấy đơn hàng.</p>
        <Link href="/orders" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          ← Danh sách đơn hàng
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/orders" className="text-sm text-gray-500 hover:text-indigo-600">
          ← Đơn hàng
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">#{order.orderNumber}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Đơn hàng #{order.orderNumber}</h1>
          <p className="text-xs text-gray-500 mt-1">
            Đặt lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="space-y-4">
        {/* Items */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Sản phẩm</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{item.productName}</p>
                  <p className="text-xs text-gray-500">
                    {formatVND(item.unitPriceVnd)} × {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">{formatVND(item.totalPriceVnd)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Tạm tính</span>
              <span>{formatVND(order.subtotalVnd)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Phí vận chuyển</span>
              <span>{formatVND(order.shippingFeeVnd)}</span>
            </div>
            {order.discountVnd > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Giảm giá</span>
                <span>− {formatVND(order.discountVnd)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold text-gray-900">
              <span>Tổng cộng</span>
              <span className="text-indigo-600">{formatVND(order.totalVnd)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Shipping address */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Địa chỉ giao hàng</h2>
            <p className="text-sm font-medium text-gray-800">{order.address.fullName}</p>
            <p className="text-xs text-gray-600">{order.address.phone}</p>
            <p className="text-xs text-gray-600 mt-1">
              {order.address.street}, {order.address.district}, {order.address.city}
            </p>
          </div>

          {/* Payment */}
          {order.payment && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">Thanh toán</h2>
              <p className="text-sm text-gray-700">{PAYMENT_METHOD_LABELS[order.payment.method] ?? order.payment.method}</p>
              <p className="text-xs text-gray-500 mt-1">
                Trạng thái: {order.payment.status === 'PENDING' ? 'Chờ thanh toán' :
                  order.payment.status === 'COMPLETED' ? 'Đã thanh toán' : order.payment.status}
              </p>
              <p className="mt-2 text-sm font-bold text-indigo-600">{formatVND(order.payment.amountVnd)}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-gray-900">Ghi chú</h2>
            <p className="text-sm text-gray-600">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-orders tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-orders/src/app/orders/
git commit -m "feat: add mfe-orders order list and detail pages"
```

---

## Self-Review: Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Add clearCart to CartService for post-checkout cleanup | Task 1 |
| GET /addresses, POST /addresses, PATCH/DELETE /addresses/:id (auth) | Task 2 |
| PATCH /addresses/:id/default | Task 2 |
| ForbiddenException when address belongs to another user | Task 2 |
| POST /orders (place order: cart → Order + OrderItems + Payment in transaction) | Tasks 3-5 |
| Fixed shipping fee (30,000 VND for COD) | Task 4 |
| Cart cleared after order placed | Task 4 |
| GET /orders (user's orders) | Task 5 |
| GET /orders/:id (user's order detail) | Task 5 |
| mfe-checkout: address picker (existing + create new inline) | Task 7 |
| mfe-checkout: order summary with items + shipping + discount + total | Task 7 |
| mfe-checkout: COD payment method (only) | Task 7 |
| mfe-checkout: redirect to mfe-orders after order placed | Task 7 |
| mfe-orders: order list with status badges | Task 9 |
| mfe-orders: order detail with items, address, payment | Task 9 |
| Both apps: reads lishop_at from localStorage for Bearer auth | Tasks 6+8 |

All spec requirements covered. ✓

---

## Remaining Plans (After Plan 5)

- **Plan 6 — Profile + Reviews**: ProfileModule (address already in Plan 5), ReviewsModule (create/list product reviews), mfe-profile (profile page, address management), product reviews in mfe-catalog
- **Plan 7 — Admin**: AdminModule, mfe-admin (dashboard, CRUD for products/orders/users)
- **Plan 8 — Notifications**: NotificationsModule, mfe-notifications

# Plan 11 — Admin Promotions Management + Analytics

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the two remaining admin features from the spec: coupon management (`/admin/promotions`) and analytics (`/admin/analytics`). Backend extends AdminModule; frontend adds two new tabs to mfe-admin.

**Architecture:** Backend adds four new endpoints to `AdminController` (coupon list, create, toggle, analytics) by extending `AdminRepository` and `AdminService`. Frontend installs `recharts`, extends `admin-api.ts` with new types and methods, and adds "Khuyến mãi" and "Phân tích" tabs to the existing admin page.

**Tech Stack:** NestJS 10 + Fastify, Prisma 5, `CouponType` from `@lishop/database`, Next.js 15 App Router, TanStack Query v5, Recharts 2.x

---

## Codebase Notes (read before implementing)

- `AdminRepository` at `lishop-backend/apps/api/src/modules/admin/admin.repository.ts` — already has `getStats`, `findAllOrders`, `findOrderById`, `updateOrderStatus`, `findAllUsers`
- `AdminService` at `admin.service.ts` — already has 4 service methods; `admin.service.spec.ts` has 5 tests; mock `repo` object must be extended with new methods
- `AdminController` at `admin.controller.ts` — already has 4 endpoints; class-level `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)` applies to all endpoints
- `CouponType` enum from `@lishop/database`: `PERCENT`, `FIXED`, `FREE_SHIPPING`
- `OrderStatus` enum from `@lishop/database`: `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`
- `prisma` singleton: `import { prisma } from '@lishop/database'`
- `CouponsRepository` at `promotions/coupons.repository.ts` already has `create()` and `findAll()` — **do NOT use it from admin**; admin manages coupons directly via Prisma in `AdminRepository` to keep AdminModule self-contained
- mfe-admin package: `@lishop/mfe-admin` — `pnpm --filter @lishop/mfe-admin` to target it
- Recharts is NOT installed in mfe-admin — must add it

---

## File Map

### Backend — new files
```
apps/api/src/modules/admin/dto/
  create-coupon.dto.ts
```

### Backend — modified files
```
apps/api/src/modules/admin/admin.repository.ts  — add AdminCoupon, AdminAnalytics, 4 new methods
apps/api/src/modules/admin/admin.service.spec.ts — add new mock methods + 4 new tests
apps/api/src/modules/admin/admin.service.ts     — add 4 new service methods
apps/api/src/modules/admin/admin.controller.ts  — add 4 new endpoints
```

### Frontend — modified files
```
lishop-frontend/apps/mfe-admin/package.json          — add recharts dependency
lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts  — add AdminCoupon, AdminAnalytics types + 4 new API methods
lishop-frontend/apps/mfe-admin/src/app/admin/page.tsx — add Khuyến mãi + Phân tích tabs
```

---

## Task 1: Backend — AdminRepository, AdminService, AdminController extensions

**Files:**
- Create: `lishop-backend/apps/api/src/modules/admin/dto/create-coupon.dto.ts`
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.repository.ts`
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.service.spec.ts` (TDD: write tests first, confirm FAIL, then implement)
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.controller.ts`

---

### Step 1: Create create-coupon.dto.ts

Create `lishop-backend/apps/api/src/modules/admin/dto/create-coupon.dto.ts`:

```typescript
import { IsEnum, IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CouponType } from '@lishop/database';

export class CreateCouponDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty({ enum: CouponType })
  @IsEnum(CouponType)
  type!: CouponType;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderVnd?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
```

---

### Step 2: Extend admin.repository.ts

Read `lishop-backend/apps/api/src/modules/admin/admin.repository.ts`.

Add these interfaces **before** the `@Injectable()` class declaration (after the existing `AdminUserItem` interface):

```typescript
export interface AdminCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderVnd: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface DailyRevenue {
  date: string; // 'YYYY-MM-DD'
  amount: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  revenue: number;
}

export interface AdminAnalytics {
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
}
```

Add these four methods **inside** the `AdminRepository` class, after `findAllUsers`:

```typescript
  listCoupons(): Promise<AdminCoupon[]> {
    return prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, code: true, type: true, value: true,
        minOrderVnd: true, maxUses: true, usedCount: true,
        expiresAt: true, isActive: true, createdAt: true,
      },
    }) as Promise<AdminCoupon[]>;
  }

  async createCoupon(data: {
    code: string;
    type: string;
    value: number;
    minOrderVnd?: number;
    maxUses?: number;
    expiresAt?: string;
  }): Promise<AdminCoupon> {
    return prisma.coupon.create({
      data: {
        code: data.code,
        type: data.type as CouponType,
        value: data.value,
        minOrderVnd: data.minOrderVnd ?? null,
        maxUses: data.maxUses ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
      select: {
        id: true, code: true, type: true, value: true,
        minOrderVnd: true, maxUses: true, usedCount: true,
        expiresAt: true, isActive: true, createdAt: true,
      },
    }) as Promise<AdminCoupon>;
  }

  async toggleCoupon(id: string): Promise<AdminCoupon | null> {
    const coupon = await prisma.coupon.findUnique({ where: { id }, select: { isActive: true } });
    if (!coupon) return null;
    return prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
      select: {
        id: true, code: true, type: true, value: true,
        minOrderVnd: true, maxUses: true, usedCount: true,
        expiresAt: true, isActive: true, createdAt: true,
      },
    }) as Promise<AdminCoupon>;
  }

  async getAnalytics(): Promise<AdminAnalytics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [orders, orderItems] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
        },
        select: { createdAt: true, totalVnd: true },
      }),
      prisma.orderItem.findMany({
        where: {
          order: { status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] } },
        },
        select: { productId: true, productName: true, totalPriceVnd: true },
      }),
    ]);

    // Aggregate daily revenue
    const revenueMap = new Map<string, number>();
    for (const order of orders) {
      const date = order.createdAt.toISOString().slice(0, 10);
      revenueMap.set(date, (revenueMap.get(date) ?? 0) + order.totalVnd);
    }
    const dailyRevenue = Array.from(revenueMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate top products
    const productMap = new Map<string, { productName: string; revenue: number }>();
    for (const item of orderItems) {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.revenue += item.totalPriceVnd;
      } else {
        productMap.set(item.productId, { productName: item.productName, revenue: item.totalPriceVnd });
      }
    }
    const topProducts = Array.from(productMap.entries())
      .map(([productId, { productName, revenue }]) => ({ productId, productName, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return { dailyRevenue, topProducts };
  }
```

Also add `CouponType` to the existing import at the top:

```typescript
import { prisma, OrderStatus, CouponType } from '@lishop/database';
```

---

### Step 3: Add tests to admin.service.spec.ts (TDD — write FIRST, run to confirm FAIL)

Read `lishop-backend/apps/api/src/modules/admin/admin.service.spec.ts`.

Add four new mock methods to the `repo` object (inside the `const repo = { ... }` block):
```typescript
    listCoupons: jest.fn(),
    createCoupon: jest.fn(),
    toggleCoupon: jest.fn(),
    getAnalytics: jest.fn(),
```

Add a mock coupon fixture after `mockUser`:
```typescript
const mockCoupon = {
  id: 'c1', code: 'TEST10', type: 'PERCENT', value: 10,
  minOrderVnd: null, maxUses: null, usedCount: 0,
  expiresAt: null, isActive: true, createdAt: new Date(),
};

const mockAnalytics = {
  dailyRevenue: [{ date: '2026-04-10', amount: 500000 }],
  topProducts: [{ productId: 'p1', productName: 'Sản phẩm A', revenue: 500000 }],
};
```

Append these four tests inside the `describe` block, after the last `it(...)`:

```typescript
  it('listCoupons returns all coupons', async () => {
    repo.listCoupons.mockResolvedValue([mockCoupon]);
    const result = await service.listCoupons();
    expect(repo.listCoupons).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('createCoupon delegates to repository', async () => {
    repo.createCoupon.mockResolvedValue(mockCoupon);
    const dto = { code: 'TEST10', type: 'PERCENT', value: 10 };
    const result = await service.createCoupon(dto);
    expect(repo.createCoupon).toHaveBeenCalledWith(dto);
    expect(result.code).toBe('TEST10');
  });

  it('toggleCoupon throws NotFoundException when coupon not found', async () => {
    repo.toggleCoupon.mockResolvedValue(null);
    await expect(service.toggleCoupon('notfound')).rejects.toThrow(NotFoundException);
  });

  it('getAnalytics returns daily revenue and top products', async () => {
    repo.getAnalytics.mockResolvedValue(mockAnalytics);
    const result = await service.getAnalytics();
    expect(result.dailyRevenue).toHaveLength(1);
    expect(result.topProducts).toHaveLength(1);
  });
```

Run to confirm FAIL:
```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=admin.service.spec --no-coverage 2>&1 | tail -10
```
Expected: FAIL on the 4 new tests (`listCoupons is not a function`, etc.), existing 5 tests still pass.

---

### Step 4: Extend admin.service.ts

Read `lishop-backend/apps/api/src/modules/admin/admin.service.ts`.

Update the import to include new types:
```typescript
import { AdminRepository, AdminStats, AdminOrderItem, AdminUserItem, AdminCoupon, AdminAnalytics } from './admin.repository';
```

Add four new methods after `listUsers`:
```typescript
  listCoupons(): Promise<AdminCoupon[]> {
    return this.repo.listCoupons();
  }

  createCoupon(data: { code: string; type: string; value: number; minOrderVnd?: number; maxUses?: number; expiresAt?: string }): Promise<AdminCoupon> {
    return this.repo.createCoupon(data);
  }

  async toggleCoupon(id: string): Promise<AdminCoupon> {
    const coupon = await this.repo.toggleCoupon(id);
    if (!coupon) throw new NotFoundException('Mã giảm giá không tồn tại');
    return coupon;
  }

  getAnalytics(): Promise<AdminAnalytics> {
    return this.repo.getAnalytics();
  }
```

---

### Step 5: Run tests to confirm PASS

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=admin.service.spec --no-coverage 2>&1 | tail -10
```
Expected: 9 tests PASS.

---

### Step 6: Extend admin.controller.ts

Read `lishop-backend/apps/api/src/modules/admin/admin.controller.ts`.

Add `Post, HttpCode, HttpStatus` to the `@nestjs/common` import. Also add:
```typescript
import { CreateCouponDto } from './dto/create-coupon.dto';
```

Add four new endpoints after `listUsers`:

```typescript
  @Get('coupons')
  @ApiOperation({ summary: 'List all coupons' })
  listCoupons() {
    return this.adminService.listCoupons();
  }

  @Post('coupons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new coupon' })
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.adminService.createCoupon(dto);
  }

  @Patch('coupons/:id/toggle')
  @ApiOperation({ summary: 'Toggle coupon active/inactive' })
  toggleCoupon(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.toggleCoupon(id);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get revenue and top products analytics' })
  getAnalytics() {
    return this.adminService.getAnalytics();
  }
```

---

### Step 7: Type-check and run all backend tests

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -10
```
Expected: all tests pass (~90 tests).

---

### Step 8: Commit

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/admin/
git commit -m "feat: add admin coupon management and analytics endpoints"
```

---

## Task 2: Frontend — mfe-admin promotions + analytics tabs

**Files:**
- Modify: `lishop-frontend/apps/mfe-admin/package.json` — add recharts
- Modify: `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts` — add types + API methods
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/page.tsx` — add 2 new tabs

---

### Step 1: Install recharts

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-admin add recharts
```

Verify `recharts` appears in `lishop-frontend/apps/mfe-admin/package.json` under `dependencies`.

---

### Step 2: Extend admin-api.ts

Read `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts`.

Add these interfaces after `AdminUserItem`:

```typescript
export type CouponType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';

export interface AdminCoupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderVnd: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCouponInput {
  code: string;
  type: CouponType;
  value: number;
  minOrderVnd?: number;
  maxUses?: number;
  expiresAt?: string;
}

export interface DailyRevenue {
  date: string;
  amount: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  revenue: number;
}

export interface AdminAnalytics {
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
}
```

Add four new methods to the `adminApi` object (after `listUsers`):

```typescript
  listCoupons: () => apiFetch<AdminCoupon[]>('/admin/coupons'),
  createCoupon: (data: CreateCouponInput) =>
    apiFetch<AdminCoupon>('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleCoupon: (id: string) =>
    apiFetch<AdminCoupon>(`/admin/coupons/${id}/toggle`, { method: 'PATCH' }),
  getAnalytics: () => apiFetch<AdminAnalytics>('/admin/analytics'),
```

---

### Step 3: Replace admin/page.tsx

Read `lishop-frontend/apps/mfe-admin/src/app/admin/page.tsx`. Replace the entire file with:

```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatVND } from '@lishop/shared';
import {
  adminApi, OrderStatus, AdminOrderItem, AdminCoupon, CouponType, CreateCouponInput,
} from '../../lib/admin-api';

// ─── Constants ───────────────────────────────────────────────────────────────

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED',
];

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

const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  PERCENT: 'Phần trăm (%)',
  FIXED: 'Cố định (₫)',
  FREE_SHIPPING: 'Miễn phí vận chuyển',
};

// ─── Components ──────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function OrderRow({ order }: { order: AdminOrderItem }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OrderStatus>(order.status);

  const mutation = useMutation({
    mutationFn: (s: OrderStatus) => adminApi.updateOrderStatus(order.id, s),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const userName =
    order.user.firstName && order.user.lastName
      ? `${order.user?.firstName} ${order.user?.lastName}`
      : order.user.email;

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-sm text-gray-700">#{order.orderNumber}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{userName}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatVND(order.totalVnd)}</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
      </td>
      <td className="px-4 py-3">
        <select
          value={status}
          onChange={(e) => {
            const s = e.target.value as OrderStatus;
            setStatus(s);
            mutation.mutate(s);
          }}
          disabled={mutation.isPending}
          className={`cursor-pointer rounded-full border-0 px-2 py-1 text-xs font-medium disabled:opacity-50 ${STATUS_COLORS[status]}`}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{order.itemCount} sp</td>
    </tr>
  );
}

function CouponRow({ coupon }: { coupon: AdminCoupon }) {
  const queryClient = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: () => adminApi.toggleCoupon(coupon.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const valueLabel =
    coupon.type === 'PERCENT'
      ? `${coupon.value}%`
      : coupon.type === 'FIXED'
      ? formatVND(coupon.value)
      : 'Miễn phí ship';

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">{coupon.code}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{COUPON_TYPE_LABELS[coupon.type]}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{valueLabel}</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {coupon.usedCount}{coupon.maxUses ? `/${coupon.maxUses}` : ''}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('vi-VN') : '—'}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          aria-pressed={coupon.isActive}
          className={`rounded-full px-2 py-0.5 text-xs font-medium disabled:opacity-50 ${
            coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {coupon.isActive ? 'Đang dùng' : 'Tắt'}
        </button>
      </td>
    </tr>
  );
}

function CreateCouponForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateCouponInput>({ code: '', type: 'PERCENT', value: 0 });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: CreateCouponInput) => adminApi.createCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Tạo mã giảm giá mới</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Mã</label>
          <input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="VD: SUMMER10"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Loại</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponType }))}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {(Object.keys(COUPON_TYPE_LABELS) as CouponType[]).map((t) => (
              <option key={t} value={t}>{COUPON_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Giá trị {form.type === 'PERCENT' ? '(%)' : form.type === 'FIXED' ? '(₫)' : ''}
          </label>
          <input
            type="number"
            min={0}
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
            disabled={form.type === 'FREE_SHIPPING'}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Số lần tối đa</label>
          <input
            type="number"
            min={1}
            placeholder="Không giới hạn"
            value={form.maxUses ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value ? Number(e.target.value) : undefined }))}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Đơn hàng tối thiểu (₫)</label>
          <input
            type="number"
            min={0}
            placeholder="Không yêu cầu"
            value={form.minOrderVnd ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, minOrderVnd: e.target.value ? Number(e.target.value) : undefined }))}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Hết hạn</label>
          <input
            type="date"
            value={form.expiresAt?.slice(0, 10) ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => createMutation.mutate(form)}
          disabled={!form.code || createMutation.isPending}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Đang tạo...' : 'Tạo mã'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Tab = 'orders' | 'users' | 'promotions' | 'analytics';

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => adminApi.listOrders(),
    enabled: tab === 'orders',
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers(),
    enabled: tab === 'users',
  });

  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => adminApi.listCoupons(),
    enabled: tab === 'promotions',
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics(),
    enabled: tab === 'analytics',
  });

  const TAB_LABELS: Record<Tab, string> = {
    orders: 'Đơn hàng',
    users: 'Người dùng',
    promotions: 'Khuyến mãi',
    analytics: 'Phân tích',
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Bảng điều khiển</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Đơn hàng" value={stats?.orderCount ?? '—'} />
        <StatCard label="Doanh thu" value={stats ? formatVND(stats.revenueVnd) : '—'} />
        <StatCard label="Người dùng" value={stats?.userCount ?? '—'} />
        <StatCard label="Sản phẩm" value={stats?.productCount ?? '—'} />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {tab === 'orders' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900">
              {ordersLoading ? 'Đang tải...' : `${orders.length} đơn hàng gần nhất`}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Mã đơn</th>
                  <th className="px-4 py-2 text-left">Khách hàng</th>
                  <th className="px-4 py-2 text-left">Tổng tiền</th>
                  <th className="px-4 py-2 text-left">Ngày đặt</th>
                  <th className="px-4 py-2 text-left">Trạng thái</th>
                  <th className="px-4 py-2 text-left">SL</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => <OrderRow key={order.id} order={order} />)}
              </tbody>
            </table>
            {!ordersLoading && orders.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có đơn hàng.</p>
            )}
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900">
              {usersLoading ? 'Đang tải...' : `${users.length} người dùng`}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Họ tên</th>
                  <th className="px-4 py-2 text-left">Vai trò</th>
                  <th className="px-4 py-2 text-left">Điểm tích lũy</th>
                  <th className="px-4 py-2 text-left">Ngày tham gia</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role === 'ADMIN' ? 'Admin' : 'Khách hàng'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{user.loyaltyPoints}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!usersLoading && users.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có người dùng.</p>
            )}
          </div>
        </div>
      )}

      {/* Promotions tab */}
      {tab === 'promotions' && (
        <div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-gray-900">
                {couponsLoading ? 'Đang tải...' : `${coupons.length} mã giảm giá`}
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateCoupon((v) => !v)}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                + Tạo mã
              </button>
            </div>
            {showCreateCoupon && (
              <div className="border-b px-4 pb-4">
                <CreateCouponForm onClose={() => setShowCreateCoupon(false)} />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Mã</th>
                    <th className="px-4 py-2 text-left">Loại</th>
                    <th className="px-4 py-2 text-left">Giá trị</th>
                    <th className="px-4 py-2 text-left">Đã dùng</th>
                    <th className="px-4 py-2 text-left">Hết hạn</th>
                    <th className="px-4 py-2 text-left">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => <CouponRow key={coupon.id} coupon={coupon} />)}
                </tbody>
              </table>
              {!couponsLoading && coupons.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có mã giảm giá.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics tab */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {/* Revenue chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Doanh thu 30 ngày gần nhất</h2>
            {analyticsLoading ? (
              <p className="py-8 text-center text-sm text-gray-400">Đang tải...</p>
            ) : !analytics || analytics.dailyRevenue.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Chưa có dữ liệu doanh thu.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.dailyRevenue} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d: string) => d.slice(5)} // 'MM-DD'
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}tr`}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatVND(value), 'Doanh thu']}
                    labelFormatter={(label: string) => `Ngày ${label}`}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top products */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-gray-900">Top 5 sản phẩm theo doanh thu</h2>
            </div>
            {analyticsLoading ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Đang tải...</p>
            ) : !analytics || analytics.topProducts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có dữ liệu.</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Sản phẩm</th>
                    <th className="px-4 py-2 text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topProducts.map((p, i) => (
                    <tr key={p.productId} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{p.productName}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatVND(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Step 4: Type-check frontend

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-admin tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

---

### Step 5: Commit

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-admin/
git commit -m "feat: add admin promotions management and analytics tabs to mfe-admin"
```

---

## Self-Review: Spec Coverage Check

| Requirement | Task |
|---|---|
| `GET /admin/coupons` — list all coupons (ADMIN only) | Task 1 |
| `POST /admin/coupons` — create coupon with type, value, limits, expiry | Task 1 |
| `PATCH /admin/coupons/:id/toggle` — activate/deactivate coupon | Task 1 |
| `GET /admin/analytics` — daily revenue (last 30 days) + top 5 products | Task 1 |
| AdminService TDD: 4 new tests (FAIL then PASS) | Task 1 |
| Recharts installed in mfe-admin | Task 2 |
| admin-api.ts: AdminCoupon, AdminAnalytics types + 4 API methods | Task 2 |
| mfe-admin: "Khuyến mãi" tab with coupon list + toggle + create form | Task 2 |
| mfe-admin: "Phân tích" tab with BarChart (30-day revenue) + top products table | Task 2 |
| All new admin endpoints protected by ADMIN role (inherited class-level guard) | Task 1 |

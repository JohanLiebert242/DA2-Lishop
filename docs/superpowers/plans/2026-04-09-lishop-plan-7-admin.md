# Plan 7 — Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin dashboard with platform stats, order management (status updates), and user listing — backend + mfe-admin frontend.

**Architecture:** Backend adds `AdminModule` with all endpoints protected by `JwtAuthGuard` + `RolesGuard` + `@Roles(UserRole.ADMIN)`. Provides stats, order listing + status updates, and user listing. Frontend builds out the `mfe-admin` stub into a full dashboard page with stats cards, orders table with inline status change, and users table.

**Tech Stack:** NestJS 10 + Fastify, Prisma 5, `@lishop/contracts` (UserRole), `@lishop/database` (OrderStatus), Next.js 15 App Router, TanStack Query v5, `@lishop/shared` (formatVND)

---

## Codebase Notes (read before implementing)

- `@Roles(UserRole.ADMIN)` — decorator from `../../common/decorators/roles.decorator`, imports `UserRole` from `@lishop/contracts`
- `RolesGuard` — at `../../common/guards/roles.guard`
- `JwtAuthGuard` — at `../auth/guards/jwt-auth.guard`
- `CurrentUser` — at `../../common/decorators/current-user.decorator`
- `prisma` singleton — `import { prisma } from '@lishop/database'`
- `OrderStatus` enum (from `@lishop/database`): PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED
- `UserRole` enum (from `@lishop/contracts`): CUSTOMER, ADMIN
- `mfe-admin` port: 3009, package name: `@lishop/mfe-admin`

---

## File Map

### Backend — new files
```
apps/api/src/modules/admin/
  dto/
    update-order-status.dto.ts
  admin.repository.ts
  admin.service.ts
  admin.service.spec.ts
  admin.controller.ts
  admin.module.ts
```

### Backend — modified files
```
apps/api/src/app.module.ts   — add AdminModule
```

### Frontend — new/modified files
```
lishop-frontend/apps/mfe-admin/src/
  lib/
    admin-api.ts
  app/
    providers.tsx
    layout.tsx        — update with Providers + metadata
    admin/page.tsx    — replace stub with full dashboard
```

---

## Task 1: AdminRepository + UpdateOrderStatusDto

**Files:**
- Create: `lishop-backend/apps/api/src/modules/admin/dto/update-order-status.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/admin/admin.repository.ts`

- [ ] **Step 1: Create update-order-status.dto.ts**

Create `lishop-backend/apps/api/src/modules/admin/dto/update-order-status.dto.ts`:
```typescript
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@lishop/database';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
```

- [ ] **Step 2: Create admin.repository.ts**

Create `lishop-backend/apps/api/src/modules/admin/admin.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma, OrderStatus } from '@lishop/database';

export interface AdminStats {
  orderCount: number;
  revenueVnd: number;
  userCount: number;
  productCount: number;
}

export interface AdminOrderItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalVnd: number;
  createdAt: Date;
  itemCount: number;
  user: { email: string; firstName: string | null; lastName: string | null };
}

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  loyaltyPoints: number;
  createdAt: Date;
}

@Injectable()
export class AdminRepository {
  async getStats(): Promise<AdminStats> {
    const [orderCount, revenueResult, userCount, productCount] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalVnd: true } }),
      prisma.user.count(),
      prisma.product.count(),
    ]);
    return {
      orderCount,
      revenueVnd: revenueResult._sum.totalVnd ?? 0,
      userCount,
      productCount,
    };
  }

  async findAllOrders(limit = 50): Promise<AdminOrderItem[]> {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    });
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalVnd: o.totalVnd,
      createdAt: o.createdAt,
      itemCount: o._count.items,
      user: o.user,
    }));
  }

  findOrderById(id: string): Promise<{ id: string; status: OrderStatus } | null> {
    return prisma.order.findUnique({ where: { id }, select: { id: true, status: true } });
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<AdminOrderItem> {
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    });
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalVnd: order.totalVnd,
      createdAt: order.createdAt,
      itemCount: order._count.items,
      user: order.user,
    };
  }

  findAllUsers(): Promise<AdminUserItem[]> {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    }) as Promise<AdminUserItem[]>;
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
git add lishop-backend/apps/api/src/modules/admin/
git commit -m "feat: add AdminRepository with stats, orders, and users queries"
```

---

## Task 2: AdminService + spec (TDD)

**Files:**
- Create: `lishop-backend/apps/api/src/modules/admin/admin.service.spec.ts`
- Create: `lishop-backend/apps/api/src/modules/admin/admin.service.ts`

- [ ] **Step 1: Create admin.service.spec.ts**

Create `lishop-backend/apps/api/src/modules/admin/admin.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { OrderStatus } from '@lishop/database';

const mockStats = { orderCount: 10, revenueVnd: 5000000, userCount: 20, productCount: 30 };
const mockOrder = {
  id: 'o1', orderNumber: 'LS-1', status: OrderStatus.PENDING, totalVnd: 500000,
  createdAt: new Date(), itemCount: 2,
  user: { email: 'a@b.com', firstName: 'A', lastName: 'B' },
};
const mockUser = {
  id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B',
  role: 'CUSTOMER', loyaltyPoints: 0, createdAt: new Date(),
};

describe('AdminService', () => {
  let service: AdminService;
  const repo = {
    getStats: jest.fn(),
    findAllOrders: jest.fn(),
    findOrderById: jest.fn(),
    updateOrderStatus: jest.fn(),
    findAllUsers: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AdminService, { provide: AdminRepository, useValue: repo }],
    }).compile();
    service = module.get(AdminService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getStats returns platform stats', async () => {
    repo.getStats.mockResolvedValue(mockStats);
    const result = await service.getStats();
    expect(result).toEqual(mockStats);
  });

  it('listOrders returns all orders', async () => {
    repo.findAllOrders.mockResolvedValue([mockOrder]);
    const result = await service.listOrders();
    expect(result).toHaveLength(1);
  });

  it('updateOrderStatus throws NotFoundException when order not found', async () => {
    repo.findOrderById.mockResolvedValue(null);
    await expect(service.updateOrderStatus('o99', OrderStatus.SHIPPED)).rejects.toThrow(NotFoundException);
  });

  it('updateOrderStatus updates and returns order', async () => {
    repo.findOrderById.mockResolvedValue({ id: 'o1', status: OrderStatus.PENDING });
    repo.updateOrderStatus.mockResolvedValue({ ...mockOrder, status: OrderStatus.SHIPPED });
    const result = await service.updateOrderStatus('o1', OrderStatus.SHIPPED);
    expect(repo.updateOrderStatus).toHaveBeenCalledWith('o1', OrderStatus.SHIPPED);
    expect(result.status).toBe(OrderStatus.SHIPPED);
  });

  it('listUsers returns all users', async () => {
    repo.findAllUsers.mockResolvedValue([mockUser]);
    const result = await service.listUsers();
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=admin.service.spec --no-coverage 2>&1 | tail -5
```
Expected: FAIL (AdminService not found).

- [ ] **Step 3: Create admin.service.ts**

Create `lishop-backend/apps/api/src/modules/admin/admin.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminRepository, AdminStats, AdminOrderItem, AdminUserItem } from './admin.repository';
import { OrderStatus } from '@lishop/database';

@Injectable()
export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  getStats(): Promise<AdminStats> {
    return this.repo.getStats();
  }

  listOrders(): Promise<AdminOrderItem[]> {
    return this.repo.findAllOrders();
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<AdminOrderItem> {
    const order = await this.repo.findOrderById(orderId);
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    return this.repo.updateOrderStatus(orderId, status);
  }

  listUsers(): Promise<AdminUserItem[]> {
    return this.repo.findAllUsers();
  }
}
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=admin.service.spec --no-coverage 2>&1 | tail -10
```
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/admin/admin.service.ts lishop-backend/apps/api/src/modules/admin/admin.service.spec.ts
git commit -m "feat: add AdminService with stats, order management, and user listing (TDD)"
```

---

## Task 3: AdminController + AdminModule + AppModule wire

**Files:**
- Create: `lishop-backend/apps/api/src/modules/admin/admin.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/admin/admin.module.ts`
- Modify: `lishop-backend/apps/api/src/app.module.ts`

- [ ] **Step 1: Create admin.controller.ts**

Create `lishop-backend/apps/api/src/modules/admin/admin.controller.ts`:
```typescript
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@lishop/contracts';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all orders' })
  listOrders() {
    return this.adminService.listOrders();
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.adminService.updateOrderStatus(id, dto.status);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  listUsers() {
    return this.adminService.listUsers();
  }
}
```

- [ ] **Step 2: Create admin.module.ts**

Create `lishop-backend/apps/api/src/modules/admin/admin.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  providers: [AdminRepository, AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
```

- [ ] **Step 3: Update app.module.ts**

Read `lishop-backend/apps/api/src/app.module.ts`. Add:
```typescript
import { AdminModule } from './modules/admin/admin.module';
```
Add `AdminModule` to the `imports` array (after ReviewsModule).

- [ ] **Step 4: Type-check and run all tests**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -20 && pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -5
```
Expected: 0 errors, all tests pass (~78 tests).

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/admin/admin.controller.ts lishop-backend/apps/api/src/modules/admin/admin.module.ts lishop-backend/apps/api/src/app.module.ts
git commit -m "feat: wire AdminModule with ADMIN-only stats, orders, and users endpoints"
```

---

## Task 4: mfe-admin — admin-api.ts + providers + layout + dashboard page

**Files:**
- Create: `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts`
- Create: `lishop-frontend/apps/mfe-admin/src/app/providers.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/layout.tsx`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/page.tsx`

- [ ] **Step 1: Create admin-api.ts**

Create `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts`:
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

export interface AdminStats {
  orderCount: number;
  revenueVnd: number;
  userCount: number;
  productCount: number;
}

export type OrderStatus =
  | 'PENDING' | 'PROCESSING' | 'SHIPPED'
  | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export interface AdminOrderItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalVnd: number;
  createdAt: string;
  itemCount: number;
  user: { email: string; firstName: string | null; lastName: string | null };
}

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  loyaltyPoints: number;
  createdAt: string;
}

export const adminApi = {
  getStats: () => apiFetch<AdminStats>('/admin/stats'),
  listOrders: () => apiFetch<AdminOrderItem[]>('/admin/orders'),
  updateOrderStatus: (id: string, status: OrderStatus) =>
    apiFetch<AdminOrderItem>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  listUsers: () => apiFetch<AdminUserItem[]>('/admin/users'),
};
```

- [ ] **Step 2: Create providers.tsx**

Create `lishop-frontend/apps/mfe-admin/src/app/providers.tsx`:
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

Read `lishop-frontend/apps/mfe-admin/src/app/layout.tsx`, then replace with:
```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Quản trị — Lishop',
  description: 'Bảng điều khiển quản trị Lishop',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Replace admin/page.tsx**

Read `lishop-frontend/apps/mfe-admin/src/app/admin/page.tsx`, then replace with:
```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { adminApi, OrderStatus, AdminOrderItem } from '../../lib/admin-api';

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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
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

  function handleStatusChange(newStatus: OrderStatus) {
    setStatus(newStatus);
    mutation.mutate(newStatus);
  }

  const userName =
    order.user.firstName && order.user.lastName
      ? `${order.user.firstName} ${order.user.lastName}`
      : order.user.email;

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-mono text-gray-700">#{order.orderNumber}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{userName}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatVND(order.totalVnd)}</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
      </td>
      <td className="px-4 py-3">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
          disabled={mutation.isPending}
          className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[status]} border-0 cursor-pointer disabled:opacity-50`}
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

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<'orders' | 'users'>('orders');

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
        {(['orders', 'users'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'orders' ? 'Đơn hàng' : 'Người dùng'}
          </button>
        ))}
      </div>

      {/* Orders table */}
      {tab === 'orders' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900">
              {ordersLoading ? 'Đang tải...' : `${orders.length} đơn hàng gần nhất`}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
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
                {orders.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </tbody>
            </table>
            {!ordersLoading && orders.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có đơn hàng.</p>
            )}
          </div>
        </div>
      )}

      {/* Users table */}
      {tab === 'users' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900">
              {usersLoading ? 'Đang tải...' : `${users.length} người dùng`}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
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
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-700'
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
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && pnpm --filter @lishop/mfe-admin tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-admin/src/
git commit -m "feat: add mfe-admin dashboard with stats, order status management, and users table"
```

---

## Self-Review: Spec Coverage Check

| Requirement | Task |
|---|---|
| GET /admin/stats (orderCount, revenueVnd, userCount, productCount) | Tasks 1–3 |
| GET /admin/orders (50 most recent, with user + itemCount) | Tasks 1–3 |
| PATCH /admin/orders/:id/status (NotFoundException if not found) | Tasks 1–3 |
| GET /admin/users (id, email, name, role, loyaltyPoints, createdAt) | Tasks 1–3 |
| All endpoints require ADMIN role (JwtAuthGuard + RolesGuard + @Roles) | Task 3 |
| AdminService TDD: 5 tests | Task 2 |
| admin-api.ts with all 4 methods | Task 4 |
| Stats cards: 4 metrics | Task 4 |
| Orders table with inline status dropdown | Task 4 |
| Users table with role badge | Task 4 |

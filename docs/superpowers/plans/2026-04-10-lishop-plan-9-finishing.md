# Plan 9 — Finishing Touches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete three remaining gaps: loyalty point history endpoint + profile display, and full shell navigation bar linking all MFEs.

**Architecture:** Backend adds `GET /users/loyalty-history` to the existing UsersModule (repository → service → controller). Frontend extends the profile page with a loyalty history card below the quick links. The shell header is upgraded from a minimal 2-link bar to a full auth-aware navigation with links to all MFEs and an ADMIN-only entry.

**Tech Stack:** NestJS 10 + Fastify, Prisma 5 (LoyaltyPoint model), Next.js 15 App Router, TanStack Query v5, Zustand (auth store in shell)

---

## Codebase Notes (read before implementing)

- `CurrentUser` in `users.controller.ts` is used as `@CurrentUser('id') userId: string` — NOT `@CurrentUser() user: { id: string }`. Follow this pattern.
- `users.service.spec.ts` already exists with 6 tests; mock uses `jest.clearAllMocks()` (not `resetAllMocks`). Add `getLoyaltyHistory` to the mock and append a new test.
- `LoyaltyPoint` Prisma model: `id`, `userId`, `points` (Int, can be negative), `description` (String), `createdAt`
- `prisma` singleton — `import { prisma } from '@lishop/database'`
- Shell auth store — `useAuthStore` (Zustand) at `../stores/auth.store`; `useAuth()` hook at `../hooks/use-auth` exposes `{ user, isAuthenticated, logout }`
- MFE ports: catalog=3002, cart=3003, checkout=3004, orders=3005, profile=3006, promotions=3007, notifications=3008, admin=3009, auth=3001

---

## File Map

### Backend — modified files
```
apps/api/src/modules/users/users.repository.ts   — add getLoyaltyHistory()
apps/api/src/modules/users/users.service.spec.ts — add getLoyaltyHistory to mock + test
apps/api/src/modules/users/users.service.ts      — add getLoyaltyHistory()
apps/api/src/modules/users/users.controller.ts   — add GET loyalty-history endpoint
```

### Frontend — modified files
```
lishop-frontend/apps/mfe-profile/src/lib/profile-api.ts   — add LoyaltyPointItem + getLoyaltyHistory
lishop-frontend/apps/mfe-profile/src/app/profile/page.tsx — add loyalty history section
lishop-frontend/apps/shell/src/components/header.tsx       — full nav with all MFE links
```

---

## Task 1: LoyaltyPoint history backend (repository → service TDD → controller)

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/users/users.repository.ts`
- Modify: `lishop-backend/apps/api/src/modules/users/users.service.spec.ts`
- Modify: `lishop-backend/apps/api/src/modules/users/users.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/users/users.controller.ts`

- [ ] **Step 1: Add `getLoyaltyHistory` to `users.repository.ts`**

Read `lishop-backend/apps/api/src/modules/users/users.repository.ts`. Add this interface and method.

After the closing brace of `updateProfile`, before the final `}` of the class, add:

```typescript
  getLoyaltyHistory(userId: string): Promise<LoyaltyPointItem[]> {
    return prisma.loyaltyPoint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, points: true, description: true, createdAt: true },
    }) as Promise<LoyaltyPointItem[]>;
  }
```

And add this interface **before** the `@Injectable()` class declaration:

```typescript
export interface LoyaltyPointItem {
  id: string;
  points: number;
  description: string;
  createdAt: Date;
}
```

The final file should look like:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma, User, Prisma } from '@lishop/database';

export interface LoyaltyPointItem {
  id: string;
  points: number;
  description: string;
  createdAt: Date;
}

@Injectable()
export class UsersRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  }

  async findByFacebookId(facebookId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { facebookId } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async updateById(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

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

  getLoyaltyHistory(userId: string): Promise<LoyaltyPointItem[]> {
    return prisma.loyaltyPoint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, points: true, description: true, createdAt: true },
    }) as Promise<LoyaltyPointItem[]>;
  }
}
```

- [ ] **Step 2: Add test to `users.service.spec.ts` (TDD — write test first)**

Read `lishop-backend/apps/api/src/modules/users/users.service.spec.ts`. The `mockRepo` object currently has: `findByEmail`, `findById`, `create`, `updateById`, `findByGoogleId`, `findByFacebookId`.

Add `getLoyaltyHistory: jest.fn()` to the `mockRepo` object, and append this test inside the `describe('UsersService', ...)` block, after the last `it(...)`:

```typescript
  it('getLoyaltyHistory delegates to repository', async () => {
    const mockHistory = [
      { id: 'lp1', points: 100, description: 'Đặt hàng LS-001', createdAt: new Date() },
      { id: 'lp2', points: -50, description: 'Đổi điểm', createdAt: new Date() },
    ];
    mockRepo.getLoyaltyHistory.mockResolvedValue(mockHistory);
    const result = await service.getLoyaltyHistory('u1');
    expect(mockRepo.getLoyaltyHistory).toHaveBeenCalledWith('u1');
    expect(result).toHaveLength(2);
    expect(result[0].points).toBe(100);
  });
```

- [ ] **Step 3: Run test to confirm FAIL**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=users.service.spec --no-coverage 2>&1 | tail -10
```
Expected: FAIL on the new test (`getLoyaltyHistory is not a function`), existing 6 tests still pass.

- [ ] **Step 4: Add `getLoyaltyHistory` to `users.service.ts`**

Read `lishop-backend/apps/api/src/modules/users/users.service.ts`. Add the import for `LoyaltyPointItem` and the new method.

Change the import line from:
```typescript
import { UsersRepository } from './users.repository';
```
to:
```typescript
import { UsersRepository, LoyaltyPointItem } from './users.repository';
```

Add this method after `updateProfile`:
```typescript
  getLoyaltyHistory(userId: string): Promise<LoyaltyPointItem[]> {
    return this.repo.getLoyaltyHistory(userId);
  }
```

- [ ] **Step 5: Run tests to confirm PASS**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=users.service.spec --no-coverage 2>&1 | tail -10
```
Expected: 7 tests PASS.

- [ ] **Step 6: Add endpoint to `users.controller.ts`**

Read `lishop-backend/apps/api/src/modules/users/users.controller.ts`. Add this endpoint after `updateProfile`:

```typescript
  @Get('loyalty-history')
  @ApiOperation({ summary: 'Get loyalty point history for current user' })
  getLoyaltyHistory(@CurrentUser('id') userId: string) {
    return this.usersService.getLoyaltyHistory(userId);
  }
```

- [ ] **Step 7: Type-check and run all tests**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && npx tsc --noEmit --project apps/api/tsconfig.json 2>&1 | head -20
```
Expected: 0 errors.

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -10
```
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/users/
git commit -m "feat: add loyalty point history endpoint to UsersModule"
```

---

## Task 2: mfe-profile loyalty history section

**Files:**
- Modify: `lishop-frontend/apps/mfe-profile/src/lib/profile-api.ts`
- Modify: `lishop-frontend/apps/mfe-profile/src/app/profile/page.tsx`

- [ ] **Step 1: Update `profile-api.ts`**

Read `lishop-frontend/apps/mfe-profile/src/lib/profile-api.ts`. Add the `LoyaltyPointItem` interface and `getLoyaltyHistory` method.

Replace the entire file with:
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

export interface LoyaltyPointItem {
  id: string;
  points: number;
  description: string;
  createdAt: string;
}

export const profileApi = {
  getProfile: () => apiFetch<UserProfile>('/users/profile'),
  updateProfile: (data: UpdateProfileInput) =>
    apiFetch<UserProfile>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getLoyaltyHistory: () => apiFetch<LoyaltyPointItem[]>('/users/loyalty-history'),
};
```

- [ ] **Step 2: Add loyalty history section to `profile/page.tsx`**

Read `lishop-frontend/apps/mfe-profile/src/app/profile/page.tsx`. Add the loyalty history query and section.

Add `LoyaltyPointItem` to the import from `profile-api`:
```typescript
import { profileApi, UpdateProfileInput, LoyaltyPointItem } from '../../lib/profile-api';
```

Add this query inside `ProfilePage`, after the `updateMutation` definition:
```typescript
  const { data: loyaltyHistory = [] } = useQuery({
    queryKey: ['loyalty-history'],
    queryFn: () => profileApi.getLoyaltyHistory(),
    enabled: !!profile,
  });
```

Add this loyalty history section after the closing `</div>` of the quick-links grid (at the very end, before the final closing `</div>` of the page):
```typescript
      {/* Loyalty point history */}
      {loyaltyHistory.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Lịch sử điểm tích lũy</h2>
          </div>
          <ul className="divide-y">
            {loyaltyHistory.map((item: LoyaltyPointItem) => (
              <li key={item.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-gray-800">{item.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    item.points >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {item.points >= 0 ? '+' : ''}{item.points}đ
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
```

The complete updated `profile/page.tsx` should be:
```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, UpdateProfileInput, LoyaltyPointItem } from '../../lib/profile-api';

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

  const { data: loyaltyHistory = [] } = useQuery({
    queryKey: ['loyalty-history'],
    queryFn: () => profileApi.getLoyaltyHistory(),
    enabled: !!profile,
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

  const initials = (profile?.firstName?.[0] ?? profile?.email?.[0] ?? 'U').toUpperCase();
  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile?.email ?? '';

  function handleEdit() {
    setForm({ firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '' });
    setEditing(true);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Trang cá nhân</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Avatar + name */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-xl font-bold text-white">
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
          className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-2xl">📦</p>
          <p className="mt-1 text-sm font-medium text-gray-700">Đơn hàng</p>
        </a>
        <a
          href="http://localhost:3003/cart"
          className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-2xl">🛒</p>
          <p className="mt-1 text-sm font-medium text-gray-700">Giỏ hàng</p>
        </a>
      </div>

      {/* Loyalty point history */}
      {loyaltyHistory.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Lịch sử điểm tích lũy</h2>
          </div>
          <ul className="divide-y">
            {loyaltyHistory.map((item: LoyaltyPointItem) => (
              <li key={item.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-gray-800">{item.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    item.points >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {item.points >= 0 ? '+' : ''}{item.points}đ
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && npx tsc --noEmit --project apps/mfe-profile/tsconfig.json 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-profile/src/
git commit -m "feat: add loyalty point history section to mfe-profile"
```

---

## Task 3: Shell header full navigation

**Files:**
- Modify: `lishop-frontend/apps/shell/src/components/header.tsx`

- [ ] **Step 1: Replace `header.tsx`**

Read `lishop-frontend/apps/shell/src/components/header.tsx`. Replace its entire content with:

```typescript
'use client';

import Link from 'next/link';
import { useAuth } from '../hooks/use-auth';

const MFE = {
  auth: 'http://localhost:3001',
  catalog: 'http://localhost:3002',
  cart: 'http://localhost:3003',
  orders: 'http://localhost:3005',
  profile: 'http://localhost:3006',
  promotions: 'http://localhost:3007',
  notifications: 'http://localhost:3008',
  admin: 'http://localhost:3009',
} as const;

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="shrink-0 text-xl font-bold text-indigo-600">
          Lishop
        </Link>

        {/* Primary nav */}
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href={`${MFE.catalog}/products`}
            className="rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            Sản phẩm
          </Link>
          <Link
            href={`${MFE.promotions}/promotions`}
            className="rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            Khuyến mãi
          </Link>

          {isAuthenticated && (
            <>
              <Link
                href={`${MFE.cart}/cart`}
                className="rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                Giỏ hàng
              </Link>
              <Link
                href={`${MFE.orders}/orders`}
                className="rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                Đơn hàng
              </Link>
              <Link
                href={`${MFE.notifications}/notifications`}
                className="rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                Thông báo
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href={`${MFE.admin}/admin`}
                  className="rounded-md px-3 py-1.5 font-medium text-purple-600 transition-colors hover:bg-purple-50 hover:text-purple-700"
                >
                  Quản trị
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Auth section */}
        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                href={`${MFE.profile}/profile`}
                className="text-sm font-medium text-gray-700 transition-colors hover:text-indigo-600"
              >
                {user?.firstName}
              </Link>
              <button
                onClick={() => void logout()}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link
                href={`${MFE.auth}/login`}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Đăng nhập
              </Link>
              <Link
                href={`${MFE.auth}/register`}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && npx tsc --noEmit --project apps/shell/tsconfig.json 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/shell/src/components/header.tsx
git commit -m "feat: add full navigation to shell header with all MFE links"
```

---

## Self-Review: Spec Coverage Check

| Requirement | Task |
|---|---|
| `LoyaltyPointItem` interface + `getLoyaltyHistory()` in UsersRepository | Task 1 |
| TDD: new test in users.service.spec.ts, FAIL then PASS | Task 1 |
| `getLoyaltyHistory()` in UsersService | Task 1 |
| `GET /users/loyalty-history` endpoint on UsersController | Task 1 |
| `getLoyaltyHistory` added to profile-api.ts | Task 2 |
| Loyalty history section on profile page (green/red points, date) | Task 2 |
| Shell header: logo + Sản phẩm + Khuyến mãi (always visible) | Task 3 |
| Shell header: Giỏ hàng, Đơn hàng, Thông báo (auth only) | Task 3 |
| Shell header: Quản trị link (ADMIN role only) | Task 3 |
| Shell header: Profile name link + Đăng xuất (authenticated) | Task 3 |
| Shell header: Đăng nhập + Đăng ký (unauthenticated) | Task 3 |

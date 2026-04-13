# Plan 8 — Notification Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add notification preference management — backend CRUD endpoints + mfe-notifications UI with per-event-type toggles for email/push/in-app channels.

**Architecture:** Backend adds `NotificationsModule` with two endpoints (GET preferences, PUT preference by eventType) protected by JwtAuthGuard. Repository uses Prisma `upsert` on the `@@unique([userId, eventType])` constraint and fills in defaults for any event types the user has never set. Frontend builds out the `mfe-notifications` stub into a toggles UI — each event type row has three toggle switches (Email, Push, Trong app), each firing an independent PATCH mutation.

**Tech Stack:** NestJS 10 + Fastify, Prisma 5, `@lishop/database` (NotificationPreference model), Next.js 15 App Router, TanStack Query v5, `@lishop/shared`

---

## Codebase Notes (read before implementing)

- `JwtAuthGuard` — at `'../auth/guards/jwt-auth.guard'` (relative to notifications module)
- `CurrentUser` decorator — at `'../../common/decorators/current-user.decorator'`; returns `{ id: string; email: string; role: string }`
- `prisma` singleton — `import { prisma } from '@lishop/database'`
- `NotificationPreference` Prisma model: `id`, `userId`, `eventType` (String), `emailEnabled`, `pushEnabled`, `inAppEnabled` (Booleans defaulting to true)
- `@@unique([userId, eventType])` — use `where: { userId_eventType: { userId, eventType } }` in Prisma upsert
- `mfe-notifications` port: 3008, package: `@lishop/mfe-notifications`
- Auth token in localStorage: `lishop_at`
- No `@Public()` needed — all notification endpoints require auth (authenticated user managing their own prefs)

---

## File Map

### Backend — new files
```
apps/api/src/modules/notifications/
  dto/
    upsert-preference.dto.ts
  notifications.repository.ts
  notifications.service.ts
  notifications.service.spec.ts
  notifications.controller.ts
  notifications.module.ts
```

### Backend — modified files
```
apps/api/src/app.module.ts   — add NotificationsModule
```

### Frontend — new/modified files
```
lishop-frontend/apps/mfe-notifications/src/
  lib/
    notifications-api.ts
  app/
    providers.tsx
    layout.tsx              — add Providers + metadata
    notifications/page.tsx  — replace stub with toggles UI
```

---

## Task 1: NotificationsRepository + UpsertPreferenceDto

**Files:**
- Create: `lishop-backend/apps/api/src/modules/notifications/dto/upsert-preference.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/notifications/notifications.repository.ts`

- [ ] **Step 1: Create upsert-preference.dto.ts**

Create `lishop-backend/apps/api/src/modules/notifications/dto/upsert-preference.dto.ts`:
```typescript
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertPreferenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;
}
```

- [ ] **Step 2: Create notifications.repository.ts**

Create `lishop-backend/apps/api/src/modules/notifications/notifications.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma } from '@lishop/database';

export const EVENT_TYPES = ['ORDER_STATUS', 'PROMOTIONS', 'NEW_PRODUCTS', 'REVIEWS'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface NotificationPreferenceItem {
  id: string;
  eventType: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

@Injectable()
export class NotificationsRepository {
  async getPreferences(userId: string): Promise<NotificationPreferenceItem[]> {
    const existing = await prisma.notificationPreference.findMany({
      where: { userId },
      select: {
        id: true,
        eventType: true,
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
      },
    });

    // Fill in defaults for any event types the user hasn't set yet
    const existingTypes = new Set(existing.map((p) => p.eventType));
    const defaults: NotificationPreferenceItem[] = EVENT_TYPES.filter(
      (et) => !existingTypes.has(et),
    ).map((et) => ({
      id: '',
      eventType: et,
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
    }));

    return [...existing, ...defaults].sort(
      (a, b) =>
        EVENT_TYPES.indexOf(a.eventType as EventType) -
        EVENT_TYPES.indexOf(b.eventType as EventType),
    );
  }

  async upsertPreference(
    userId: string,
    eventType: string,
    data: { emailEnabled?: boolean; pushEnabled?: boolean; inAppEnabled?: boolean },
  ): Promise<NotificationPreferenceItem> {
    return prisma.notificationPreference.upsert({
      where: { userId_eventType: { userId, eventType } },
      create: {
        userId,
        eventType,
        emailEnabled: data.emailEnabled ?? true,
        pushEnabled: data.pushEnabled ?? true,
        inAppEnabled: data.inAppEnabled ?? true,
      },
      update: {
        ...(data.emailEnabled !== undefined && { emailEnabled: data.emailEnabled }),
        ...(data.pushEnabled !== undefined && { pushEnabled: data.pushEnabled }),
        ...(data.inAppEnabled !== undefined && { inAppEnabled: data.inAppEnabled }),
      },
      select: {
        id: true,
        eventType: true,
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
      },
    });
  }
}
```

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && npx tsc --noEmit --project apps/api/tsconfig.json 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/notifications/
git commit -m "feat: add NotificationsRepository with preference upsert and defaults"
```

---

## Task 2: NotificationsService + spec (TDD)

**Files:**
- Create: `lishop-backend/apps/api/src/modules/notifications/notifications.service.spec.ts`
- Create: `lishop-backend/apps/api/src/modules/notifications/notifications.service.ts`

- [ ] **Step 1: Create notifications.service.spec.ts**

Create `lishop-backend/apps/api/src/modules/notifications/notifications.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';

const mockPrefs = [
  { id: 'p1', eventType: 'ORDER_STATUS', emailEnabled: true, pushEnabled: true, inAppEnabled: true },
  { id: 'p2', eventType: 'PROMOTIONS', emailEnabled: false, pushEnabled: true, inAppEnabled: true },
];

describe('NotificationsService', () => {
  let service: NotificationsService;
  const repo = {
    getPreferences: jest.fn(),
    upsertPreference: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: repo },
      ],
    }).compile();
    service = module.get(NotificationsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getPreferences delegates to repository', async () => {
    repo.getPreferences.mockResolvedValue(mockPrefs);
    const result = await service.getPreferences('u1');
    expect(repo.getPreferences).toHaveBeenCalledWith('u1');
    expect(result).toHaveLength(2);
  });

  it('upsertPreference delegates to repository with correct args', async () => {
    const updated = { ...mockPrefs[0], emailEnabled: false };
    repo.upsertPreference.mockResolvedValue(updated);
    const result = await service.upsertPreference('u1', 'ORDER_STATUS', { emailEnabled: false });
    expect(repo.upsertPreference).toHaveBeenCalledWith('u1', 'ORDER_STATUS', { emailEnabled: false });
    expect(result.emailEnabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=notifications.service.spec --no-coverage 2>&1 | tail -5
```
Expected: FAIL (NotificationsService not found).

- [ ] **Step 3: Create notifications.service.ts**

Create `lishop-backend/apps/api/src/modules/notifications/notifications.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import {
  NotificationsRepository,
  NotificationPreferenceItem,
} from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  getPreferences(userId: string): Promise<NotificationPreferenceItem[]> {
    return this.repo.getPreferences(userId);
  }

  upsertPreference(
    userId: string,
    eventType: string,
    data: { emailEnabled?: boolean; pushEnabled?: boolean; inAppEnabled?: boolean },
  ): Promise<NotificationPreferenceItem> {
    return this.repo.upsertPreference(userId, eventType, data);
  }
}
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && pnpm --filter @lishop/api test -- --testPathPattern=notifications.service.spec --no-coverage 2>&1 | tail -10
```
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/notifications/notifications.service.ts lishop-backend/apps/api/src/modules/notifications/notifications.service.spec.ts
git commit -m "feat: add NotificationsService with preference retrieval and upsert (TDD)"
```

---

## Task 3: NotificationsController + NotificationsModule + AppModule wire

**Files:**
- Create: `lishop-backend/apps/api/src/modules/notifications/notifications.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/notifications/notifications.module.ts`
- Modify: `lishop-backend/apps/api/src/app.module.ts`

- [ ] **Step 1: Create notifications.controller.ts**

Create `lishop-backend/apps/api/src/modules/notifications/notifications.controller.ts`:
```typescript
import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { UpsertPreferenceDto } from './dto/upsert-preference.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  getPreferences(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Put('preferences/:eventType')
  @ApiOperation({ summary: 'Upsert notification preference for an event type' })
  upsertPreference(
    @CurrentUser() user: { id: string },
    @Param('eventType') eventType: string,
    @Body() dto: UpsertPreferenceDto,
  ) {
    return this.notificationsService.upsertPreference(user.id, eventType, dto);
  }
}
```

- [ ] **Step 2: Create notifications.module.ts**

Create `lishop-backend/apps/api/src/modules/notifications/notifications.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  providers: [NotificationsRepository, NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
```

- [ ] **Step 3: Update app.module.ts**

Read `lishop-backend/apps/api/src/app.module.ts`. Add:
```typescript
import { NotificationsModule } from './modules/notifications/notifications.module';
```
Add `NotificationsModule` to the `imports` array (after AdminModule). Do NOT remove or change any other modules.

- [ ] **Step 4: Type-check and run all tests**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-backend && npx tsc --noEmit --project apps/api/tsconfig.json 2>&1 | head -20 && pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -10
```
Expected: 0 type errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/notifications/notifications.controller.ts lishop-backend/apps/api/src/modules/notifications/notifications.module.ts lishop-backend/apps/api/src/app.module.ts
git commit -m "feat: wire NotificationsModule with preference CRUD endpoints"
```

---

## Task 4: mfe-notifications — API client + providers + layout + preferences page

**Files:**
- Create: `lishop-frontend/apps/mfe-notifications/src/lib/notifications-api.ts`
- Create: `lishop-frontend/apps/mfe-notifications/src/app/providers.tsx`
- Modify: `lishop-frontend/apps/mfe-notifications/src/app/layout.tsx`
- Modify: `lishop-frontend/apps/mfe-notifications/src/app/notifications/page.tsx`

- [ ] **Step 1: Create notifications-api.ts**

Create `lishop-frontend/apps/mfe-notifications/src/lib/notifications-api.ts`:
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

export interface NotificationPreference {
  id: string;
  eventType: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

export interface UpsertPreferenceInput {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
}

export const EVENT_LABELS: Record<string, string> = {
  ORDER_STATUS: 'Trạng thái đơn hàng',
  PROMOTIONS: 'Khuyến mãi',
  NEW_PRODUCTS: 'Sản phẩm mới',
  REVIEWS: 'Phản hồi đánh giá',
};

export const notificationsApi = {
  getPreferences: () =>
    apiFetch<NotificationPreference[]>('/notifications/preferences'),
  upsertPreference: (eventType: string, data: UpsertPreferenceInput) =>
    apiFetch<NotificationPreference>(`/notifications/preferences/${eventType}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
```

- [ ] **Step 2: Create providers.tsx**

Create `lishop-frontend/apps/mfe-notifications/src/app/providers.tsx`:
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 3: Update layout.tsx**

Read `lishop-frontend/apps/mfe-notifications/src/app/layout.tsx`, then replace with:
```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Thông báo — Lishop',
  description: 'Cài đặt thông báo Lishop',
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Replace notifications/page.tsx**

Read `lishop-frontend/apps/mfe-notifications/src/app/notifications/page.tsx`, then replace with:
```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationsApi,
  NotificationPreference,
  UpsertPreferenceInput,
  EVENT_LABELS,
} from '../../lib/notifications-api';

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function PreferenceRow({ pref }: { pref: NotificationPreference }) {
  const queryClient = useQueryClient();
  const label = EVENT_LABELS[pref.eventType] ?? pref.eventType;

  const mutation = useMutation({
    mutationFn: (data: UpsertPreferenceInput) =>
      notificationsApi.upsertPreference(pref.eventType, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] }),
  });

  return (
    <div className="flex items-center justify-between border-b py-4 last:border-0">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">Email</span>
          <Toggle
            checked={pref.emailEnabled}
            onChange={(v) => mutation.mutate({ emailEnabled: v })}
            disabled={mutation.isPending}
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">Push</span>
          <Toggle
            checked={pref.pushEnabled}
            onChange={(v) => mutation.mutate({ pushEnabled: v })}
            disabled={mutation.isPending}
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">Trong app</span>
          <Toggle
            checked={pref.inAppEnabled}
            onChange={(v) => mutation.mutate({ inAppEnabled: v })}
            disabled={mutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences(),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Cài đặt thông báo</h1>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Column headers */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Loại thông báo
          </span>
          <div className="flex gap-6">
            <span className="w-11 text-center text-xs font-semibold uppercase text-gray-500">
              Email
            </span>
            <span className="w-11 text-center text-xs font-semibold uppercase text-gray-500">
              Push
            </span>
            <span className="w-11 text-center text-xs font-semibold uppercase text-gray-500">
              App
            </span>
          </div>
        </div>

        <div className="px-6">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-gray-400">Đang tải...</p>
          ) : (
            preferences.map((pref) => (
              <PreferenceRow key={pref.eventType} pref={pref} />
            ))
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">Thay đổi được lưu tự động.</p>
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2/lishop-frontend && npx tsc --noEmit --project apps/mfe-notifications/tsconfig.json 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-notifications/src/
git commit -m "feat: add mfe-notifications preferences UI with per-channel toggles"
```

---

## Self-Review: Spec Coverage Check

| Requirement | Task |
|---|---|
| NotificationPreference CRUD (get all for user, upsert by eventType) | Tasks 1–3 |
| `@@unique([userId, eventType])` used in Prisma upsert | Task 1 |
| Fill in defaults for event types user hasn't set | Task 1 (`getPreferences`) |
| 4 event types: ORDER_STATUS, PROMOTIONS, NEW_PRODUCTS, REVIEWS | Task 1 |
| GET /notifications/preferences (auth-gated) | Task 3 |
| PUT /notifications/preferences/:eventType (auth-gated) | Task 3 |
| TDD: 2 service tests | Task 2 |
| Frontend: per-event-type row with Email/Push/In-app toggles | Task 4 |
| Each toggle fires independent mutation (only sends changed field) | Task 4 |
| `queryClient.invalidateQueries` on mutation success | Task 4 |
| TanStack Query v5 patterns (no `onSuccess` on `useQuery`) | Task 4 |
| Loading state | Task 4 |

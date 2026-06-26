# Củng cố Nền tảng — Lishop Platform Consolidation

*Tài liệu này định nghĩa Phase 6 (Polish & Scale) của dự án Lishop — giai đoạn củng cố, chuẩn hóa và chuẩn bị cho production deployment sau khi toàn bộ tính năng đã hoàn thành.*

> 📄 **Xem thêm:** [Quá trình research và quyết định tech stack →](tech-stack-decision.md)

---

## 1. Mục tiêu (Objectives)

**Tổng quan:** Đưa Lishop từ "đầy đủ tính năng" lên "sẵn sàng production" bằng cách đóng góp các lỗ hổng kỹ thuật, chuẩn hóa mã nguồn, tăng cường bảo mật, hiệu năng, và khả năng vận hành.

### OKRs

| Objective | Key Results |
|---|---|
| **Ổn định hệ thống** | 100% tests passing, health check depth ≥ 3 services, uptime ≥ 99.9% |
| **Bảo mật** | Helmet + CSRF active, 0 critical/high vulnerabilities |
| **Hiệu năng frontend** | Lighthouse ≥ 90 cho tất cả MFE, lazy load + image optimization |
| **Testing** | Unit test coverage ≥ 70% cho service layer + repository layer |
| **Developer Experience** | ESLint + Prettier active, CI pass trước mọi merge, không còn dead code |
| **Production readiness** | Dockerfile cho API, deploy job trong CI, nginx production config |

---

## 2. Backend Consolidation

### 2.1 Security

| # | Mục | Hiện trạng | Yêu cầu | Mức độ |
|---|-----|-----------|---------|:------:|
| B-01 | **Helmet** | `helmet` installed nhưng chưa register trong `main.ts` | Thêm `app.register(helmet)` với CSP, HSTS, X-Frame-Options | 🔴 Cao |
| B-02 | **CSRF Protection** | Chưa có | Thêm `@fastify/csrf-protection` hoặc double-submit cookie pattern | 🔴 Cao |
| B-03 | **Rate limiting per-endpoint** | Global 100 req/min duy nhất | Gắn `@Throttle()` cho `auth/login`, `auth/register`, payment endpoints | 🟡 Trung bình |
| B-04 | **Input validation governance** | Zod schemas trong `@lishop/contracts` nhưng không sync với Swagger | Đảm bảo validation messages tiếng Việt mapping file | 🟢 Thấp |
| B-05 | **Logging injection** | Console log trong AI services | Chuyển tất cả `console.log` trong AI services sang NestJS `Logger` | 🟢 Thấp |

#### B-01: Register Helmet trong main.ts

```typescript
// apps/api/src/main.ts
import helmet from '@fastify/helmet'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  )

  // Security
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  })

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:3010',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
      'http://localhost:3006',
      'http://localhost:3007',
      'http://localhost:3008',
      'http://localhost:3009',
      'http://localhost:3011',
    ],
    credentials: true,
  })
}
```

#### B-02: CSRF Protection

```bash
pnpm --filter @lishop/api add @fastify/csrf-protection
```

```typescript
import csrf from '@fastify/csrf-protection'

await app.register(csrf, {
  cookieOpts: { signed: false, sameSite: 'strict' },
})
```

#### B-03: Per-endpoint Rate Limiting

```typescript
// auth.controller.ts
import { Throttle, SkipThrottle } from '@nestjs/throttler'

@Post('login')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests/minute
async login(@Body() dto: LoginDto) { ... }

@Post('register')
@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests/minute
async register(@Body() dto: RegisterDto) { ... }
```

### 2.2 Observability

| # | Mục | Hiện trạng | Yêu cầu | Mức độ |
|---|-----|-----------|---------|:------:|
| B-06 | **Health check** | Chỉ `GET /health` trả `{ status: 'ok' }` | Thêm DB, Redis, MeiliSearch health probes | 🟡 Trung bình |
| B-07 | **Log files cleanup** | 5+ log files trong `apps/api/` | Xóa + thêm vào `.gitignore` | 🟢 Thấp |
| B-08 | **Logger standardization** | AI services dùng `console.log` | Migration sang NestJS `Logger` | 🟢 Thấp |

#### B-06: Enhanced Health Check

```typescript
// apps/api/src/health/health.controller.ts
import { PrismaService } from '@lishop/database'
import { RedisService } from '../redis/redis.service'

@Get('health')
async check() {
  const db = await this.prisma.$queryRaw`SELECT 1`.catch(() => null)
  const redis = await this.redis.ping().catch(() => null)
  const meili = await this.meili.health().catch(() => null)

  return {
    status: db && redis && meili ? 'ok' : 'degraded',
    services: {
      database: db ? 'up' : 'down',
      redis: redis === 'PONG' ? 'up' : 'down',
      meilisearch: meili ? 'up' : 'down',
    },
    timestamp: new Date().toISOString(),
  }
}
```

### 2.3 Testing

| # | Mục | Hiện trạng | Yêu cầu | Mức độ |
|---|-----|-----------|---------|:------:|
| B-09 | **Failing test** | `faq.service.spec.ts` fail — thiếu `ConfigService` | Fix test module | 🔴 Cao |
| B-10 | **Missing module tests** | `shop-chat`, `realtime` không có spec | Thêm unit test cho service + controller | 🟡 Trung bình |
| B-11 | **Coverage configuration** | `collectCoverage` chưa set, không có thresholds | Thêm Jest config với `collectCoverageFrom` + `coverageThreshold` | 🟡 Trung bình |
| B-12 | **E2E tests** | Chỉ test `GET /health` | Thêm E2E test cho critical paths (auth, checkout, payment) | 🟡 Trung bình |
| B-13 | **Missing `@types/supertest`** | `supertest` có nhưng thiếu types | Thêm vào devDependencies | 🟢 Thấp |

#### B-09: Fix FAQ Test Module

```typescript
// apps/api/src/modules/support/faq.service.spec.ts
const module = await Test.createTestingModule({
  providers: [
    FaqService,
    { provide: PrismaService, useValue: mockPrisma },
    { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mock-key') } },
    { provide: AIService, useValue: mockAI },
  ],
}).compile()
```

#### B-11: Jest Coverage Config

```json
// apps/api/package.json
{
  "jest": {
    "collectCoverage": true,
    "collectCoverageFrom": ["src/modules/**/*.service.ts", "src/modules/**/*.controller.ts"],
    "coverageThreshold": {
      "global": {
        "branches": 60,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
```

### 2.4 Infrastructure

| # | Mục | Hiện trạng | Yêu cầu | Mức độ |
|---|-----|-----------|---------|:------:|
| B-14 | **Dockerfile for API** | Chưa có | Tạo multi-stage Dockerfile | 🔴 Cao |
| B-15 | **CI deploy job** | CI chạy test, không có deploy | Thêm deploy job vào GitHub Actions | 🟡 Trung bình |
| B-16 | **Repository error handling** | Raw Prisma errors có thể propagate lên controller | Thêm Prisma error interceptor hoặc repository-level error mapping | 🟡 Trung bình |

#### B-14: Dockerfile cho API

```dockerfile
# lishop-backend/Dockerfile
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN pnpm fetch

FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm install --prefer-offline
RUN pnpm --filter @lishop/api exec prisma generate
RUN pnpm --filter @lishop/api build
RUN pnpm prune --prod

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 4000
CMD ["node", "apps/api/dist/main"]
```

### 2.5 Developer Experience

| # | Mục | Hiện trạng | Yêu cầu | Mức độ |
|---|-----|-----------|---------|:------:|
| B-17 | **ESLint** | `@lishop/config` có eslint config nhưng `eslint` package chưa install | Thêm `eslint` vào root devDependencies | 🔴 Cao |
| B-18 | **Prettier** | Chưa có | Thêm Prettier + `.prettierrc` | 🟢 Thấp |
| B-19 | **Husky + lint-staged** | Chưa có | Thiết lập pre-commit hooks cho lint + type-check | 🟢 Thấp |

---

## 3. Frontend Consolidation

### 3.1 Error Handling & Resilience

| # | Mục | Hiện trạng | Yêu cầu | Mức độ |
|---|-----|-----------|---------|:------:|
| F-01 | **Error boundaries** | Không MFE nào có `error.tsx` | Thêm `error.tsx` vào tất cả 11 MFE apps | 🔴 Cao |
| F-02 | **Global error fallback** | Runtime error → white screen | Tạo `GlobalErrorBoundary` component trong `@lishop/ui` + tích hợp shell | 🟡 Trung bình |
| F-03 | **Toast consistency** | Một số MFE không có Toaster, mfe-seller dùng `sonner` riêng | Chuẩn hóa tất cả MFE dùng `@lishop/ui/Toaster` | 🟡 Trung bình |
| F-04 | **Empty state consolidation** | `AdminEmptyState` + `SellerEmptyState` riêng | Gộp thành `EmptyState` trong `@lishop/ui` | 🟢 Thấp |

#### F-01: error.tsx template cho mỗi MFE

```typescript
// apps/mfe-cart/src/app/error.tsx
'use client'

export default function CartError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-lg font-semibold">Đã xảy ra lỗi</h2>
      <p className="text-muted-foreground text-sm">
        Không thể tải trang giỏ hàng. Vui lòng thử lại.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded-md text-sm"
      >
        Thử lại
      </button>
    </div>
  )
}
```

#### F-03: Toast component consolidation

```typescript
// packages/ui/src/components/toaster.tsx
'use client'

import { Toaster as SonnerToaster } from 'sonner'

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

export function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground',
          error: 'group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground',
          success: 'group-[.toaster]:bg-green-600 group-[.toaster]:text-white',
        },
      }}
      {...props}
    />
  )
}
```

### 3.2 Performance

| # | Mục | Hiện trạng | Yêu cầu | Mức độ |
|---|-----|-----------|---------|:------:|
| F-05 | **Lazy loading** | Không có `React.lazy`/`next/dynamic` | Áp dụng cho heavy components (admin charts, AI widgets) | 🟡 Trung bình |
| F-06 | **Image optimization** | 15+ `<img>` tags bypass `next/image` | Convert tất cả sang `next/image`, thêm domains vào config | 🟡 Trung bình |
| F-07 | **Skeleton loading consistency** | 4 MFE có skeleton, 7 MFE không | Dùng `@lishop/ui/Skeleton` cho tất cả loading states | 🟢 Thấp |
| F-08 | **Dead code** | Hidden hero section trong shell `page.tsx` (~50 dòng) | Xóa bỏ | 🟢 Thấp |

#### F-05: Lazy loading example

```typescript
// apps/mfe-admin/src/app/dashboard/page.tsx
import dynamic from 'next/dynamic'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'

const RevenueChart = dynamic(
  () => import('@/components/charts/revenue-chart'),
  { loading: () => <DashboardSkeleton /> }
)

const AIAnalyticsPanel = dynamic(
  () => import('@/components/ai/analytics-insights'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
```

### 3.3 Architecture & Standards

| # | Mục | Hiện trạng | Yêu cầu | Mức độ |
|---|-----|-----------|---------|:------:|
| F-09 | **Nginx: seller upstream** | mfe-seller (port 3011) missing | Thêm upstream + location block | 🔴 Cao |
| F-10 | **Nginx: WebSocket support** | Không có WebSocket upgrade | Thêm `proxy_set_header Upgrade` cho WebSocket connections | 🟡 Trung bình |
| F-11 | **Nginx: caching headers** | Không có | Thêm cache headers cho static assets | 🟡 Trung bình |
| F-12 | **i18n: dead dependency** | `next-intl` trong deps nhưng không dùng | Hoặc implement i18n properly, hoặc xóa khỏi deps | 🟡 Trung bình |
| F-13 | **mfe-seller missing deps** | Không có `@lishop/ui`, `zustand`, `lucide-react` | Đồng bộ dependency profile với các MFE khác | 🟡 Trung bình |
| F-14 | **recharts version mismatch** | v3.8.1 (admin) vs v2.12.0 (seller) | Đồng bộ về cùng version | 🟢 Thấp |
| F-15 | **Log files cleanup** | 10+ log files trong project root | Xóa + thêm `.gitignore` pattern | 🟢 Thấp |

#### F-09: Nginx seller upstream

```nginx
# Thêm vào http block
upstream mfe-seller {
    server 127.0.0.1:3011;
}

# Thêm vào server block
location /seller {
    proxy_pass http://mfe-seller;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### F-10: WebSocket support trong nginx

```nginx
# Cho các location cần WebSocket (shop-chat, realtime notifications)
location /socket.io/ {
    proxy_pass http://lishop-api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400;
}
```

### 3.4 Testing

| # | Mục | Hiện trạng | Yêu cầu | Mức độ |
|---|-----|-----------|---------|:------:|
| F-16 | **Unit test coverage** | 5 tests cho toàn bộ frontend | Thêm test cho packages + MFE apps critical paths | 🟡 Trung bình |
| F-17 | **Vitest config** | Chỉ packages có vitest, MFE apps không | Thêm vitest + testing-library cho tất cả MFE | 🟡 Trung bình |
| F-18 | **E2E tests** | 32 Playwright test files | Mở rộng coverage cho seller + admin flows | 🟢 Thấp |

### 3.5 UI/UX

| # | Mục | Hiện trạng | Yêu cầu | Mức độ |
|---|-----|-----------|---------|:------:|
| F-19 | **Responsive admin/seller** | Fixed-width sidebar, không responsive | Thêm mobile-responsive layout cho admin + seller | 🟡 Trung bình |
| F-20 | **accessibility audit** | Không có formal accessibility testing | Thêm axe-core vào E2E hoặc manual audit | 🟢 Thấp |
| F-21 | **SEO metadata** | Thiếu Open Graph, canonical, sitemap | Thêm `generateMetadata` cho tất cả pages + sitemap generation | 🟢 Thấp |

---

## 4. Testing Strategy Consolidation

| # | Mục | Mô tả | Assign | Mức độ |
|---|------|-------|--------|:------:|
| T-01 | **Fix backend failing test** | `faq.service.spec.ts` — missing ConfigService | Backend | 🔴 Cao |
| T-02 | **Add shop-chat tests** | Service + controller tests | Backend | 🟡 Trung bình |
| T-03 | **Add realtime tests** | Gateway tests | Backend | 🟡 Trung bình |
| T-04 | **Backend coverage thresholds** | 70% service + repository | Backend | 🟡 Trung bình |
| T-05 | **Backend E2E critical paths** | Auth → checkout → payment flow | Backend | 🟡 Trung bình |
| T-06 | **Frontend package tests** | `@lishop/ui` component tests | Frontend | 🟢 Thấp |
| T-07 | **Frontend MFE vitest setup** | Thêm vitest cho tất cả MFE | Frontend | 🟡 Trung bình |
| T-08 | **E2E seller flows** | Seller dashboard, product management | Frontend | 🟢 Thấp |
| T-09 | **E2E admin flows** | Admin CRUD, analytics | Frontend | 🟢 Thấp |

---

## 5. CI/CD & Infrastructure Consolidation

| # | Mục | Hiện trạng | Yêu cầu | Mức độ |
|---|-----|-----------|---------|:------:|
| I-01 | **API Dockerfile** | Chưa có | Build image từ multi-stage Dockerfile | 🔴 Cao |
| I-02 | **CI deploy job** | Chỉ test, không deploy | Thêm Docker build + push + deploy steps | 🟡 Trung bình |
| I-03 | **Docker compose app service** | docker-compose chỉ có DB/Redis/Meili, không có app | Thêm `lishop-api` service | 🟡 Trung bình |
| I-04 | **SSL/HTTPS** | chưa có | Let's Encrypt + certbot trong nginx | 🟡 Trung bình |
| I-05 | **Nginx production config** | Chỉ có dev config | Tạo `nginx.prod.conf` với SSL, caching, security headers | 🟡 Trung bình |

### I-03: Docker Compose App Service

```yaml
# docker-compose.yml — thêm vào services
lishop-api:
  build:
    context: ./lishop-backend
    dockerfile: Dockerfile
  ports:
    - "4000:4000"
  environment:
    - DATABASE_URL=postgresql://lishop:lishop@postgres:5432/lishop
    - REDIS_URL=redis://redis:6379
    - MEILISEARCH_URL=http://meilisearch:7700
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_started
    meilisearch:
      condition: service_started
```

---

## 6. Roadmap & Ưu tiên (Prioritized Execution Plan)

### Sprint 1 — Nền tảng & Bảo mật (Foundation & Security)

| Item | Module | Effort |
|------|--------|:------:|
| B-01 | Helmet registration | 1h |
| B-02 | CSRF protection | 2h |
| B-03 | Per-endpoint rate limiting | 3h |
| B-09 | Fix failing FAQ test | 1h |
| B-14 | API Dockerfile | 3h |
| F-09 | Nginx seller upstream | 1h |
| F-01 | error.tsx cho 11 MFE | 4h |
| **Total** | | **~15h** |

### Sprint 2 — Testing & Chất lượng (Testing & Quality)

| Item | Module | Effort |
|------|--------|:------:|
| B-10 | shop-chat + realtime tests | 4h |
| B-11 | Coverage configuration | 1h |
| B-12 | Backend E2E critical paths | 6h |
| B-13 | Missing types | 0.5h |
| F-16 | Frontend package tests | 4h |
| F-17 | MFE vitest setup | 3h |
| T-08 | E2E seller flows | 4h |
| **Total** | | **~22.5h** |

### Sprint 3 — Hiệu năng & Vận hành (Performance & Operations)

| Item | Module | Effort |
|------|--------|:------:|
| B-06 | Enhanced health check | 2h |
| B-15 | CI deploy job | 4h |
| B-16 | Prisma error interceptor | 2h |
| F-05 | Lazy loading | 4h |
| F-06 | Image optimization | 3h |
| F-10 | Nginx WebSocket support | 1h |
| F-11 | Nginx caching headers | 1h |
| I-03 | Docker compose app service | 2h |
| I-05 | Nginx production config | 3h |
| **Total** | | **~22h** |

### Sprint 4 — Chuẩn hóa & DX (Standardization & Developer Experience)

| Item | Module | Effort |
|------|--------|:------:|
| B-05 | Console.log → NestJS Logger | 2h |
| B-07 | Log files cleanup | 0.5h |
| B-17 | ESLint setup | 1h |
| B-18 | Prettier setup | 0.5h |
| B-19 | Husky + lint-staged | 1h |
| F-03 | Toast consolidation | 2h |
| F-04 | Empty state consolidation | 1h |
| F-07 | Skeleton standardization | 2h |
| F-12 | i18n decision | 1h |
| F-13 | mfe-seller deps sync | 2h |
| F-14 | recharts version sync | 0.5h |
| F-15 | Frontend log cleanup | 0.5h |
| F-19 | Admin/seller responsive | 4h |
| F-21 | SEO metadata | 3h |
| **Total** | | **~21h** |

---

## 7. Definition of Done (Tiêu chí hoàn thành Phase 6)

### Backend
- [ ] Helmet, CSRF, CORS configured correctly
- [ ] Rate limiting: per-endpoint cho auth + payment
- [ ] 0 failing tests, coverage ≥ 70% cho service + repository layer
- [ ] shop-chat + realtime modules có unit tests
- [ ] Health check monitors DB + Redis + MeiliSearch
- [ ] Dockerfile builds successfully
- [ ] ESLint + Prettier active, CI pass

### Frontend
- [ ] Tất cả 11 MFE có `error.tsx` hoặc `GlobalErrorBoundary`
- [ ] Tất cả MFE dùng chung Toast component từ `@lishop/ui`
- [ ] `EmptyState` component trong `@lishop/ui`, dùng bởi admin + seller
- [ ] 15+ `<img>` converted sang `next/image`
- [ ] Lazy loading cho admin charts + AI widgets
- [ ] Nginx config có seller upstream + WebSocket support
- [ ] i18n: hoặc fully implemented, hoặc removed dead deps

### CI/CD & Infrastructure
- [ ] CI pipeline có deploy job (build → push → deploy)
- [ ] Docker Compose có app service
- [ ] Nginx production config (SSL + caching + security headers)

### Documentation
- [ ] Tài liệu này đã review và cập nhật
- [ ] Phase 6 marked complete trong Project Charter

---

## 8. Risks & Mitigations

| Rủi ro | Impact | Likelihood | Mitigation |
|--------|:------:|:----------:|-----------|
| Thay đổi nginx config ảnh hưởng production | Cao | Thấp | Test trên staging trước, có rollback plan |
| CSRF gây lỗi payment flows | Cao | Thấp | Whitelist các routes cần thiết, test đầy đủ |
| Quá nhiều items → sprint không kịp | Trung bình | Trung bình | Prioritize 🔴 items first, 🟡 có thể carry-over |
| Code change conflicts giữa consolidation và feature branches | Trung bình | Cao | Consolidation trên nhánh riêng, merge sớm, thường xuyên |

---

*Tài liệu được tạo ngày 26/06/2026. Cập nhật sau mỗi sprint review.*

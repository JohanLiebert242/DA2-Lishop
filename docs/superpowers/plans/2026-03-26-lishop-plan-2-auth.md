# Plan 2 — Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full authentication — JWT credentials flow, email verification, password reset, Google/Facebook OAuth on the backend; Zustand auth store + `useAuth` hook + Header in the shell; and all five auth pages in mfe-auth.

**Architecture:** NestJS modules (`RedisModule`, `MailModule`, `UsersModule`, `AuthModule`) backed by Prisma + Redis + BullMQ. Frontend shell owns global auth state (Zustand) and exposes `useAuth()` as a Module Federation shared singleton. mfe-auth pages use React Hook Form + Zod and call the API directly.

**Tech Stack:** NestJS 10 + Fastify, Prisma 5, `ioredis`, `@nestjs/bullmq` + BullMQ, `nodemailer`, `jose`, Next.js 15 App Router, Zustand 4, TanStack Query v5, React Hook Form + `@hookform/resolvers`, Zod.

---

## File Map

### Backend — new files

```
apps/api/src/
  modules/
    redis/
      redis.service.ts          — ioredis client, get/set/del/setex helpers
      redis.module.ts           — global module exporting RedisService
    mail/
      mail.service.ts           — enqueue jobs onto 'mail' BullMQ queue
      mail.processor.ts         — WorkerHost, processes send-email job via nodemailer
      mail.module.ts            — BullMQModule.registerQueue('mail') + MailService + MailProcessor
    users/
      users.repository.ts       — Prisma CRUD for User model
      users.service.ts          — findByEmail, findById, create, updateById
      users.module.ts           — exports UsersService
    auth/
      jwt.service.ts            — jose sign/verify access+refresh tokens
      auth.service.ts           — register, login, logout, refresh, me, verifyEmail, forgotPassword, resetPassword
      auth.controller.ts        — HTTP endpoints for all auth routes
      auth.module.ts            — wires all auth deps, imports UsersModule, RedisModule, MailModule
      dto/
        register.dto.ts
        login.dto.ts
        forgot-password.dto.ts
        reset-password.dto.ts
        verify-email.dto.ts
      guards/
        jwt-auth.guard.ts       — verifies Bearer access token, checks Redis blacklist
        jwt-refresh.guard.ts    — verifies refresh token from httpOnly cookie
        google-oauth.guard.ts   — custom Google OAuth code-exchange guard
        facebook-oauth.guard.ts — custom Facebook OAuth code-exchange guard
      decorators/
        public.decorator.ts     — @Public() skips JwtAuthGuard
```

### Backend — modified files

```
apps/api/src/config/config.module.ts   — add SMTP_*, GOOGLE_*, FACEBOOK_*, CLIENT_URL to Joi schema
apps/api/src/app.module.ts             — import AuthModule, RedisModule
apps/api/package.json                  — add ioredis, @nestjs/bullmq, bullmq, nodemailer, jose
```

### Frontend shell — new/modified files

```
apps/shell/src/
  lib/
    query-client.ts            — singleton QueryClient
  stores/
    auth.store.ts              — Zustand store: user, accessToken, setAuth, clearAuth
  hooks/
    use-auth.ts                — wraps Zustand store, exposes login/logout/refresh helpers
  components/
    providers.tsx              — QueryClientProvider + (future) other providers
    header.tsx                 — top nav: logo, cart icon, login/logout button
  app/
    layout.tsx                 — modified: wrap with Providers + Header
```

### Frontend mfe-auth — new/modified files

```
apps/mfe-auth/src/
  lib/
    auth-api.ts                — typed fetch wrapper for all /auth/* endpoints
  app/
    login/page.tsx             — React Hook Form login form
    register/page.tsx          — React Hook Form register form
    verify-email/page.tsx      — reads ?token from URL, calls verifyEmail API
    forgot-password/page.tsx   — email input, calls forgotPassword API
    reset-password/page.tsx    — reads ?token from URL, new password form
    layout.tsx                 — modified: wrap with QueryClientProvider
```

---

## Task 1: Install backend dependencies

**Files:**
- Modify: `lishop-backend/apps/api/package.json`

- [ ] **Step 1: Install runtime deps for api**

Run from `lishop-backend/`:
```bash
pnpm --filter @lishop/api add ioredis @nestjs/bullmq bullmq nodemailer jose
```

- [ ] **Step 2: Install type defs**

```bash
pnpm --filter @lishop/api add -D @types/nodemailer @types/ioredis
```

- [ ] **Step 3: Verify install**

```bash
pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -20
```
Expected: no new errors (may still have existing ones if DB not running — ignore those).

- [ ] **Step 4: Commit**

```bash
cd lishop-backend
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: add ioredis, bullmq, nodemailer, jose deps to api"
```

---

## Task 2: Extend ConfigModule with new env vars

**Files:**
- Modify: `lishop-backend/apps/api/src/config/config.module.ts`

- [ ] **Step 1: Update config.module.ts**

Replace the entire file:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(4000),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        SMTP_HOST: Joi.string().required(),
        SMTP_PORT: Joi.number().default(587),
        SMTP_USER: Joi.string().required(),
        SMTP_PASS: Joi.string().required(),
        SMTP_FROM: Joi.string().default('Lishop <no-reply@lishop.vn>'),
        CLIENT_URL: Joi.string().default('http://localhost:3000'),
        GOOGLE_CLIENT_ID: Joi.string().optional().default(''),
        GOOGLE_CLIENT_SECRET: Joi.string().optional().default(''),
        FACEBOOK_CLIENT_ID: Joi.string().optional().default(''),
        FACEBOOK_CLIENT_SECRET: Joi.string().optional().default(''),
      }),
    }),
  ],
})
export class ConfigModule {}
```

- [ ] **Step 2: Add missing vars to `.env`**

Open `lishop-backend/.env` and add these lines (if not present):
```
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Lishop <no-reply@lishop.vn>
CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/config/config.module.ts .env.example
git commit -m "chore: extend config validation schema with SMTP/OAuth/JWT env vars"
```

---

## Task 3: Redis Module

**Files:**
- Create: `lishop-backend/apps/api/src/modules/redis/redis.service.ts`
- Create: `lishop-backend/apps/api/src/modules/redis/redis.module.ts`

- [ ] **Step 1: Write failing test for RedisService**

Create `lishop-backend/apps/api/src/modules/redis/redis.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => key === 'REDIS_URL' ? 'redis://localhost:6380' : undefined },
        },
      ],
    }).compile();
    service = module.get(RedisService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd lishop-backend
pnpm --filter @lishop/api test -- --testPathPattern=redis.service.spec --no-coverage
```
Expected: FAIL — `RedisService` not found.

- [ ] **Step 3: Create RedisService**

Create `lishop-backend/apps/api/src/modules/redis/redis.service.ts`:
```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.client = new Redis(this.config.get<string>('REDIS_URL')!);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.client.setex(key, ttlSeconds, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }
}
```

- [ ] **Step 4: Create RedisModule**

Create `lishop-backend/apps/api/src/modules/redis/redis.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=redis.service.spec --no-coverage
```
Expected: PASS (note: test only checks `toBeDefined`, does not connect to real Redis).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/redis/
git commit -m "feat: add global RedisModule with ioredis client"
```

---

## Task 4: Mail Module

**Files:**
- Create: `lishop-backend/apps/api/src/modules/mail/mail.service.ts`
- Create: `lishop-backend/apps/api/src/modules/mail/mail.processor.ts`
- Create: `lishop-backend/apps/api/src/modules/mail/mail.module.ts`

- [ ] **Step 1: Write failing test for MailService**

Create `lishop-backend/apps/api/src/modules/mail/mail.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;
  const mockQueue = { add: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: getQueueToken('mail'), useValue: mockQueue },
      ],
    }).compile();
    service = module.get(MailService);
  });

  it('sendVerificationEmail should enqueue a job', async () => {
    await service.sendVerificationEmail('user@example.com', 'token123');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'send-email',
      expect.objectContaining({ type: 'verify-email', to: 'user@example.com' }),
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  });

  it('sendPasswordResetEmail should enqueue a job', async () => {
    await service.sendPasswordResetEmail('user@example.com', 'token456');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'send-email',
      expect.objectContaining({ type: 'reset-password', to: 'user@example.com' }),
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=mail.service.spec --no-coverage
```
Expected: FAIL — `MailService` not found.

- [ ] **Step 3: Create MailService**

Create `lishop-backend/apps/api/src/modules/mail/mail.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface MailJobData {
  type: 'verify-email' | 'reset-password';
  to: string;
  token: string;
}

@Injectable()
export class MailService {
  constructor(@InjectQueue('mail') private readonly mailQueue: Queue) {}

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    await this.mailQueue.add(
      'send-email',
      { type: 'verify-email', to, token } satisfies MailJobData,
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    await this.mailQueue.add(
      'send-email',
      { type: 'reset-password', to, token } satisfies MailJobData,
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }
}
```

- [ ] **Step 4: Create MailProcessor**

Create `lishop-backend/apps/api/src/modules/mail/mail.processor.ts`:
```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailJobData } from './mail.service';

@Processor('mail')
export class MailProcessor extends WorkerHost {
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    super();
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async process(job: Job<MailJobData>): Promise<void> {
    const { type, to, token } = job.data;
    const clientUrl = this.config.get<string>('CLIENT_URL');
    const from = this.config.get<string>('SMTP_FROM');

    if (type === 'verify-email') {
      const link = `${clientUrl}/auth/verify-email?token=${token}`;
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Xác nhận email của bạn — Lishop',
        html: `<p>Nhấp vào liên kết để xác nhận email của bạn:</p><p><a href="${link}">${link}</a></p><p>Liên kết hết hạn sau 24 giờ.</p>`,
      });
    } else if (type === 'reset-password') {
      const link = `${clientUrl}/auth/reset-password?token=${token}`;
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Đặt lại mật khẩu — Lishop',
        html: `<p>Nhấp vào liên kết để đặt lại mật khẩu của bạn:</p><p><a href="${link}">${link}</a></p><p>Liên kết hết hạn sau 1 giờ.</p>`,
      });
    }
  }
}
```

- [ ] **Step 5: Create MailModule**

Create `lishop-backend/apps/api/src/modules/mail/mail.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'mail' }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=mail.service.spec --no-coverage
```
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/mail/
git commit -m "feat: add MailModule with BullMQ queue and nodemailer processor"
```

---

## Task 5: Users Module

**Files:**
- Create: `lishop-backend/apps/api/src/modules/users/users.repository.ts`
- Create: `lishop-backend/apps/api/src/modules/users/users.service.ts`
- Create: `lishop-backend/apps/api/src/modules/users/users.module.ts`

- [ ] **Step 1: Write failing tests for UsersService**

Create `lishop-backend/apps/api/src/modules/users/users.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hash',
  firstName: 'Test',
  lastName: 'User',
  role: 'CUSTOMER',
  emailVerified: false,
  googleId: null,
  facebookId: null,
  avatarUrl: null,
  loyaltyPoints: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;
  const mockRepo = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findByEmail should return user', async () => {
    mockRepo.findByEmail.mockResolvedValue(mockUser);
    const result = await service.findByEmail('test@example.com');
    expect(result).toEqual(mockUser);
    expect(mockRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('findById should return user', async () => {
    mockRepo.findById.mockResolvedValue(mockUser);
    const result = await service.findById('user-1');
    expect(result).toEqual(mockUser);
  });

  it('create should call repo with data', async () => {
    mockRepo.create.mockResolvedValue(mockUser);
    const result = await service.create({
      email: 'test@example.com',
      passwordHash: 'hash',
      firstName: 'Test',
      lastName: 'User',
    });
    expect(result).toEqual(mockUser);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=users.service.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 3: Create UsersRepository**

Create `lishop-backend/apps/api/src/modules/users/users.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma, User, Prisma } from '@lishop/database';

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
}
```

- [ ] **Step 4: Create UsersService**

Create `lishop-backend/apps/api/src/modules/users/users.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@lishop/database';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findByEmail(email);
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findById(id);
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.repo.findByGoogleId(googleId);
  }

  findByFacebookId(facebookId: string): Promise<User | null> {
    return this.repo.findByFacebookId(facebookId);
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.repo.create(data);
  }

  updateById(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.repo.updateById(id, data);
  }
}
```

- [ ] **Step 5: Create UsersModule**

Create `lishop-backend/apps/api/src/modules/users/users.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 6: Run tests to verify pass**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=users.service.spec --no-coverage
```
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/users/
git commit -m "feat: add UsersModule with repository and service"
```

---

## Task 6: JWT Service

**Files:**
- Create: `lishop-backend/apps/api/src/modules/auth/jwt.service.ts`

- [ ] **Step 1: Write failing test**

Create `lishop-backend/apps/api/src/modules/auth/jwt.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from './jwt.service';

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string> = {
                JWT_ACCESS_SECRET: 'test-access-secret-32chars-minimum!!',
                JWT_REFRESH_SECRET: 'test-refresh-secret-32chars-min!!',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();
    service = module.get(JwtService);
  });

  it('should sign and verify an access token', async () => {
    const payload = { sub: 'user-1', email: 'test@example.com', role: 'CUSTOMER' };
    const token = await service.signAccessToken(payload);
    expect(typeof token).toBe('string');
    const decoded = await service.verifyAccessToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.jti).toBeDefined();
  });

  it('should sign and verify a refresh token', async () => {
    const token = await service.signRefreshToken('user-1');
    const decoded = await service.verifyRefreshToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.jti).toBeDefined();
  });

  it('should throw on invalid access token', async () => {
    await expect(service.verifyAccessToken('invalid.token.here')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=jwt.service.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 3: Create JwtService**

Create `lishop-backend/apps/api/src/modules/auth/jwt.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { randomUUID } from 'crypto';

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  jti: string;
}

@Injectable()
export class JwtService {
  private readonly accessSecret: Uint8Array;
  private readonly refreshSecret: Uint8Array;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(private readonly config: ConfigService) {
    this.accessSecret = new TextEncoder().encode(
      this.config.get<string>('JWT_ACCESS_SECRET')!,
    );
    this.refreshSecret = new TextEncoder().encode(
      this.config.get<string>('JWT_REFRESH_SECRET')!,
    );
    this.accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    this.refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
  }

  async signAccessToken(payload: { sub: string; email: string; role: string }): Promise<string> {
    return new SignJWT({ ...payload, jti: randomUUID() })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.accessExpiresIn)
      .sign(this.accessSecret);
  }

  async signRefreshToken(userId: string): Promise<string> {
    return new SignJWT({ sub: userId, jti: randomUUID() })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.refreshExpiresIn)
      .sign(this.refreshSecret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret);
    return payload as AccessTokenPayload;
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const { payload } = await jwtVerify(token, this.refreshSecret);
    return payload as RefreshTokenPayload;
  }

  /** Returns the TTL (seconds) remaining for a token based on its exp claim */
  getRemainingTtl(exp: number): number {
    return Math.max(0, exp - Math.floor(Date.now() / 1000));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=jwt.service.spec --no-coverage
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/jwt.service.ts apps/api/src/modules/auth/jwt.service.spec.ts
git commit -m "feat: add JwtService using jose with sign/verify for access+refresh tokens"
```

---

## Task 7: Auth DTOs

**Files:**
- Create: `lishop-backend/apps/api/src/modules/auth/dto/register.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/auth/dto/login.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/auth/dto/forgot-password.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/auth/dto/reset-password.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/auth/dto/verify-email.dto.ts`

- [ ] **Step 1: Create register.dto.ts**

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) firstName!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) lastName!: string;
}
```

- [ ] **Step 2: Create login.dto.ts**

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(1) password!: string;
}
```

- [ ] **Step 3: Create forgot-password.dto.ts**

```typescript
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty() @IsEmail() email!: string;
}
```

- [ ] **Step 4: Create reset-password.dto.ts**

```typescript
import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty() @IsString() @MinLength(1) token!: string;
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(128) password!: string;
}
```

- [ ] **Step 5: Create verify-email.dto.ts**

```typescript
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty() @IsString() @MinLength(1) token!: string;
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth/dto/
git commit -m "feat: add auth DTOs (register, login, forgot-password, reset-password, verify-email)"
```

---

## Task 8: Auth Service — credentials flow (register/login/logout/refresh/me)

**Files:**
- Create: `lishop-backend/apps/api/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Write failing tests for credentials flow**

Create `lishop-backend/apps/api/src/modules/auth/auth.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from './jwt.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: null as string | null,
  firstName: 'Test',
  lastName: 'User',
  role: 'CUSTOMER',
  emailVerified: false,
  googleId: null,
  facebookId: null,
  avatarUrl: null,
  loyaltyPoints: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService — credentials', () => {
  let service: AuthService;
  const usersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    findByGoogleId: jest.fn(),
    findByFacebookId: jest.fn(),
  };
  const jwtService = {
    signAccessToken: jest.fn().mockResolvedValue('access-token'),
    signRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    getRemainingTtl: jest.fn().mockReturnValue(900),
  };
  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn().mockResolvedValue(false),
  };
  const mailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.register({ email: 'test@example.com', password: 'pass1234', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user, send verification email, return tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const created = { ...mockUser, passwordHash: 'hashed' };
      usersService.create.mockResolvedValue(created);
      const result = await service.register({
        email: 'new@example.com',
        password: 'pass1234',
        firstName: 'New',
        lastName: 'User',
      });
      expect(usersService.create).toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith('new@example.com', expect.any(String));
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password invalid', async () => {
      const user = { ...mockUser, passwordHash: await bcrypt.hash('correct', 10) };
      usersService.findByEmail.mockResolvedValue(user);
      await expect(service.login({ email: user.email, password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('pass1234', 10);
      const user = { ...mockUser, passwordHash: hash };
      usersService.findByEmail.mockResolvedValue(user);
      const result = await service.login({ email: user.email, password: 'pass1234' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('logout', () => {
    it('should blacklist the access token jti', async () => {
      jwtService.verifyAccessToken.mockResolvedValue({ jti: 'jti-abc', exp: Math.floor(Date.now() / 1000) + 900 });
      await service.logout('some-token');
      expect(redisService.setex).toHaveBeenCalledWith('blacklist:token:jti-abc', expect.any(Number), '1');
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException on invalid refresh token', async () => {
      jwtService.verifyRefreshToken.mockRejectedValue(new Error('invalid'));
      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should return new accessToken', async () => {
      jwtService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', jti: 'jti-xyz' });
      usersService.findById.mockResolvedValue(mockUser);
      const result = await service.refresh('valid-refresh-token');
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('me', () => {
    it('should return user without passwordHash', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      const result = await service.me('user-1');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=auth.service.spec --no-coverage
```
Expected: FAIL.

- [ ] **Step 3: Create AuthService**

Create `lishop-backend/apps/api/src/modules/auth/auth.service.ts`:
```typescript
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { JwtService } from './jwt.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '@lishop/database';

const BCRYPT_ROUNDS = 12;
const EMAIL_VERIFY_TTL = 60 * 60 * 24; // 24 hours
const PASSWORD_RESET_TTL = 60 * 60; // 1 hour

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const verifyToken = randomBytes(32).toString('hex');
    await this.redisService.setex(`email_verify:${verifyToken}`, EMAIL_VERIFY_TTL, user.id);
    await this.mailService.sendVerificationEmail(user.email, verifyToken);

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async logout(accessToken: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAccessToken(accessToken);
      if (payload.jti && payload.exp) {
        const ttl = this.jwtService.getRemainingTtl(payload.exp);
        if (ttl > 0) {
          await this.redisService.setex(`blacklist:token:${payload.jti}`, ttl, '1');
        }
      }
    } catch {
      // Token already invalid — nothing to blacklist
    }
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload;
    try {
      payload = await this.jwtService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub!);
    if (!user) throw new UnauthorizedException('User not found');

    const accessToken = await this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { accessToken };
  }

  async me(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.redisService.get(`email_verify:${token}`);
    if (!userId) throw new UnauthorizedException('Invalid or expired token');
    await this.usersService.updateById(userId, { emailVerified: true });
    await this.redisService.del(`email_verify:${token}`);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return; // Don't leak whether email exists
    const token = randomBytes(32).toString('hex');
    await this.redisService.setex(`pwd_reset:${token}`, PASSWORD_RESET_TTL, user.id);
    await this.mailService.sendPasswordResetEmail(email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.redisService.get(`pwd_reset:${token}`);
    if (!userId) throw new UnauthorizedException('Invalid or expired token');
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersService.updateById(userId, { passwordHash });
    await this.redisService.del(`pwd_reset:${token}`);
  }

  async findOrCreateOAuthUser(data: {
    provider: 'google' | 'facebook';
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }): Promise<AuthTokens> {
    const field = data.provider === 'google' ? 'googleId' : 'facebookId';
    const findMethod = data.provider === 'google'
      ? this.usersService.findByGoogleId.bind(this.usersService)
      : this.usersService.findByFacebookId.bind(this.usersService);

    let user = await findMethod(data.providerId);
    if (!user) {
      user = await this.usersService.findByEmail(data.email);
      if (user) {
        user = await this.usersService.updateById(user.id, {
          [field]: data.providerId,
          emailVerified: true,
          ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
        });
      } else {
        user = await this.usersService.create({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: data.avatarUrl,
          emailVerified: true,
          [field]: data.providerId,
        });
      }
    }
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      this.jwtService.signRefreshToken(user.id),
    ]);
    return { accessToken, refreshToken };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=auth.service.spec --no-coverage
```
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/auth.service.ts apps/api/src/modules/auth/auth.service.spec.ts
git commit -m "feat: add AuthService with register/login/logout/refresh/me/verifyEmail/forgotPassword/resetPassword"
```

---

## Task 9: Auth Guards

**Files:**
- Create: `lishop-backend/apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- Create: `lishop-backend/apps/api/src/modules/auth/guards/jwt-refresh.guard.ts`
- Create: `lishop-backend/apps/api/src/modules/auth/decorators/public.decorator.ts`

- [ ] **Step 1: Create Public decorator**

Create `lishop-backend/apps/api/src/modules/auth/decorators/public.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 2: Create JwtAuthGuard**

Create `lishop-backend/apps/api/src/modules/auth/guards/jwt-auth.guard.ts`:
```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { JwtService } from '../jwt.service';
import { RedisService } from '../../redis/redis.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException('Missing access token');

    let payload;
    try {
      payload = await this.jwtService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    if (payload.jti) {
      const blacklisted = await this.redisService.exists(`blacklist:token:${payload.jti}`);
      if (blacklisted) throw new UnauthorizedException('Token has been revoked');
    }

    (request as any).user = { id: payload.sub, email: payload.email, role: payload.role };
    return true;
  }

  private extractBearerToken(request: FastifyRequest): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
```

- [ ] **Step 3: Create JwtRefreshGuard**

Create `lishop-backend/apps/api/src/modules/auth/guards/jwt-refresh.guard.ts`:
```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtService } from '../jwt.service';

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = (request.cookies as Record<string, string>)?.['refresh_token'];
    if (!token) throw new UnauthorizedException('Missing refresh token');

    let payload;
    try {
      payload = await this.jwtService.verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    (request as any).refreshToken = token;
    (request as any).user = { id: payload.sub };
    return true;
  }
}
```

- [ ] **Step 4: Write guard tests**

Create `lishop-backend/apps/api/src/modules/auth/guards/jwt-auth.guard.spec.ts`:
```typescript
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '../jwt.service';
import { RedisService } from '../../redis/redis.service';

function mockContext(headers: Record<string, string> = {}) {
  const request = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const jwtService = { verifyAccessToken: jest.fn() };
  const redisService = { exists: jest.fn().mockResolvedValue(false) };
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };

  beforeEach(() => {
    guard = new JwtAuthGuard(
      jwtService as any,
      redisService as any,
      reflector as any,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('allows public routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const result = await guard.canActivate(mockContext());
    expect(result).toBe(true);
  });

  it('throws if no bearer token', async () => {
    await expect(guard.canActivate(mockContext())).rejects.toThrow(UnauthorizedException);
  });

  it('throws if token is blacklisted', async () => {
    jwtService.verifyAccessToken.mockResolvedValue({ sub: 'u1', jti: 'jti-1', email: 'a@b.com', role: 'CUSTOMER' });
    redisService.exists.mockResolvedValue(true);
    await expect(guard.canActivate(mockContext({ authorization: 'Bearer token' }))).rejects.toThrow(UnauthorizedException);
  });

  it('sets user on request when token is valid', async () => {
    jwtService.verifyAccessToken.mockResolvedValue({ sub: 'u1', jti: 'jti-2', email: 'a@b.com', role: 'CUSTOMER' });
    redisService.exists.mockResolvedValue(false);
    const ctx = mockContext({ authorization: 'Bearer valid-token' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 5: Run guard tests**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=jwt-auth.guard.spec --no-coverage
```
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth/guards/ apps/api/src/modules/auth/decorators/
git commit -m "feat: add JwtAuthGuard, JwtRefreshGuard, and @Public() decorator"
```

---

## Task 10: OAuth Guards (Google + Facebook)

**Files:**
- Create: `lishop-backend/apps/api/src/modules/auth/guards/google-oauth.guard.ts`
- Create: `lishop-backend/apps/api/src/modules/auth/guards/facebook-oauth.guard.ts`

- [ ] **Step 1: Create GoogleOAuthGuard**

Create `lishop-backend/apps/api/src/modules/auth/guards/google-oauth.guard.ts`:
```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';

interface GoogleTokenResponse {
  access_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  given_name: string;
  family_name: string;
  picture?: string;
}

@Injectable()
export class GoogleOAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const code = (request.query as Record<string, string>).code;
    if (!code) return false;

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${this.config.get<string>('CLIENT_URL')}/auth/oauth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = (await userRes.json()) as GoogleUserInfo;

    (request as any).oauthUser = {
      provider: 'google' as const,
      providerId: userInfo.id,
      email: userInfo.email,
      firstName: userInfo.given_name,
      lastName: userInfo.family_name ?? '',
      avatarUrl: userInfo.picture,
    };
    return true;
  }
}
```

- [ ] **Step 2: Create FacebookOAuthGuard**

Create `lishop-backend/apps/api/src/modules/auth/guards/facebook-oauth.guard.ts`:
```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';

interface FacebookTokenResponse {
  access_token: string;
}

interface FacebookUserInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  picture?: { data: { url: string } };
}

@Injectable()
export class FacebookOAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const code = (request.query as Record<string, string>).code;
    if (!code) return false;

    const clientId = this.config.get<string>('FACEBOOK_CLIENT_ID');
    const clientSecret = this.config.get<string>('FACEBOOK_CLIENT_SECRET');
    const redirectUri = `${this.config.get<string>('CLIENT_URL')}/auth/oauth/facebook/callback`;

    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({ client_id: clientId!, client_secret: clientSecret!, redirect_uri: redirectUri, code }),
    );
    const tokenData = (await tokenRes.json()) as FacebookTokenResponse;

    const userRes = await fetch(
      `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${tokenData.access_token}`,
    );
    const userInfo = (await userRes.json()) as FacebookUserInfo;

    (request as any).oauthUser = {
      provider: 'facebook' as const,
      providerId: userInfo.id,
      email: userInfo.email,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      avatarUrl: userInfo.picture?.data?.url,
    };
    return true;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/guards/google-oauth.guard.ts apps/api/src/modules/auth/guards/facebook-oauth.guard.ts
git commit -m "feat: add custom Google and Facebook OAuth guards (no Passport)"
```

---

## Task 11: Auth Controller + Module + Wire AppModule

**Files:**
- Create: `lishop-backend/apps/api/src/modules/auth/auth.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/auth/auth.module.ts`
- Modify: `lishop-backend/apps/api/src/app.module.ts`

- [ ] **Step 1: Create AuthController**

Create `lishop-backend/apps/api/src/modules/auth/auth.controller.ts`:
```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { FacebookOAuthGuard } from './guards/facebook-oauth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: FastifyReply) {
    const { accessToken, refreshToken } = await this.authService.register(dto);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: FastifyReply) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke tokens' })
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const token = req.headers.authorization?.slice(7) ?? '';
    await this.authService.logout(token);
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  async refresh(@Req() req: FastifyRequest) {
    const refreshToken = (req as any).refreshToken as string;
    return this.authService.refresh(refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Verify email address with token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
  }

  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('oauth/google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const oauthUser = (req as any).oauthUser;
    const { accessToken, refreshToken } = await this.authService.findOrCreateOAuthUser(oauthUser);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    const clientUrl = process.env['CLIENT_URL'] ?? 'http://localhost:3000';
    res.redirect(`${clientUrl}/?token=${accessToken}`);
  }

  @Public()
  @UseGuards(FacebookOAuthGuard)
  @Get('oauth/facebook/callback')
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  async facebookCallback(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const oauthUser = (req as any).oauthUser;
    const { accessToken, refreshToken } = await this.authService.findOrCreateOAuthUser(oauthUser);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    const clientUrl = process.env['CLIENT_URL'] ?? 'http://localhost:3000';
    res.redirect(`${clientUrl}/?token=${accessToken}`);
  }
}
```

- [ ] **Step 2: Create AuthModule**

Create `lishop-backend/apps/api/src/modules/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtService } from './jwt.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { FacebookOAuthGuard } from './guards/facebook-oauth.guard';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [UsersModule, MailModule],
  providers: [AuthService, JwtService, JwtAuthGuard, JwtRefreshGuard, GoogleOAuthGuard, FacebookOAuthGuard],
  controllers: [AuthController],
  exports: [JwtService, JwtAuthGuard],
})
export class AuthModule {}
```

- [ ] **Step 3: Update AppModule**

Replace `lishop-backend/apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validationPipe } from './common/pipes/validation.pipe';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    RedisModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_PIPE, useValue: validationPipe },
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Register cookie plugin in main.ts**

The auth controller uses `res.setCookie` — Fastify needs `@fastify/cookie`. Install it:
```bash
pnpm --filter @lishop/api add @fastify/cookie
```

Update `lishop-backend/apps/api/src/main.ts` to register the cookie plugin:
```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  await app.register(fastifyCookie);

  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Lishop API')
    .setDescription('Lishop E-Commerce REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env['PORT'] ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.warn(`Lishop API listening on port ${port}`);
}

bootstrap();
```

- [ ] **Step 5: Type-check the backend**

```bash
pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors (or only pre-existing errors unrelated to auth).

- [ ] **Step 6: Run all auth tests**

```bash
pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -20
```
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/auth/auth.controller.ts apps/api/src/modules/auth/auth.module.ts apps/api/src/app.module.ts apps/api/src/main.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat: wire AuthModule into AppModule with full auth controller (register/login/logout/refresh/me/verify/oauth)"
```

---

## Task 12: Shell — Install deps + QueryClientProvider + Auth Store + useAuth

**Files:**
- Create: `lishop-frontend/apps/shell/src/lib/query-client.ts`
- Create: `lishop-frontend/apps/shell/src/stores/auth.store.ts`
- Create: `lishop-frontend/apps/shell/src/hooks/use-auth.ts`
- Create: `lishop-frontend/apps/shell/src/components/providers.tsx`

- [ ] **Step 1: Install react-hook-form + zod in mfe-auth (needed for Task 13)**

```bash
cd lishop-frontend
pnpm --filter @lishop/mfe-auth add react-hook-form @hookform/resolvers zod
```

- [ ] **Step 2: Create query-client.ts**

Create `lishop-frontend/apps/shell/src/lib/query-client.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: { retry: 0 },
  },
});
```

- [ ] **Step 3: Create auth.store.ts**

Create `lishop-frontend/apps/shell/src/stores/auth.store.ts`:
```typescript
import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}));
```

- [ ] **Step 4: Create use-auth.ts**

Create `lishop-frontend/apps/shell/src/hooks/use-auth.ts`:
```typescript
'use client';

import { useCallback } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { eventBus } from '@lishop/event-bus';
import { LishopEvent } from '@lishop/event-bus';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export function useAuth() {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).message ?? 'Login failed');
    const data = await res.json();
    const token: string = data.data?.accessToken ?? data.accessToken;

    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    const userProfile = meData.data ?? meData;

    setAuth(userProfile, token);
    eventBus.emit(LishopEvent.AUTH_LOGIN, { userId: userProfile.id, role: userProfile.role });
  }, [setAuth]);

  const logout = useCallback(async () => {
    if (accessToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
    clearAuth();
    eventBus.emit(LishopEvent.AUTH_LOGOUT, undefined);
  }, [accessToken, clearAuth]);

  const refresh = useCallback(async (): Promise<string | null> => {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) { clearAuth(); return null; }
    const data = await res.json();
    const token: string = data.data?.accessToken ?? data.accessToken;
    if (user) setAuth(user, token);
    return token;
  }, [user, setAuth, clearAuth]);

  return { user, accessToken, isAuthenticated: !!user, login, logout, refresh };
}
```

- [ ] **Step 5: Create providers.tsx**

Create `lishop-frontend/apps/shell/src/components/providers.tsx`:
```typescript
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/shell/src/lib/ apps/shell/src/stores/ apps/shell/src/hooks/ apps/shell/src/components/providers.tsx apps/mfe-auth/package.json pnpm-lock.yaml
git commit -m "feat: add shell QueryClientProvider, Zustand auth store, and useAuth hook"
```

---

## Task 13: Shell — Header + Layout

**Files:**
- Create: `lishop-frontend/apps/shell/src/components/header.tsx`
- Modify: `lishop-frontend/apps/shell/src/app/layout.tsx`

- [ ] **Step 1: Create Header component**

Create `lishop-frontend/apps/shell/src/components/header.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { useAuth } from '../hooks/use-auth';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          Lishop
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/products" className="text-sm text-gray-600 hover:text-gray-900">
            Sản phẩm
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">{user?.firstName}</span>
              <button
                onClick={() => void logout()}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="http://localhost:3001/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Đăng nhập
              </Link>
              <Link
                href="http://localhost:3001/register"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update shell layout.tsx**

Replace `lishop-frontend/apps/shell/src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers';
import { Header } from '../components/header';

export const metadata: Metadata = {
  title: 'Lishop',
  description: 'Lishop E-Commerce Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-gray-50">
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Type-check shell**

```bash
pnpm --filter @lishop/shell tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/shell/src/components/header.tsx apps/shell/src/app/layout.tsx
git commit -m "feat: add shell Header with auth state + wrap layout with Providers"
```

---

## Task 14: mfe-auth — API client + login page

**Files:**
- Create: `lishop-frontend/apps/mfe-auth/src/lib/auth-api.ts`
- Modify: `lishop-frontend/apps/mfe-auth/src/app/login/page.tsx`

- [ ] **Step 1: Create auth-api.ts**

Create `lishop-frontend/apps/mfe-auth/src/lib/auth-api.ts`:
```typescript
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message ?? json.error ?? 'Request failed');
  }
  // Backend wraps responses in { data: ... }
  return (json.data ?? json) as T;
}

export interface AuthTokens {
  accessToken: string;
}

export const authApi = {
  register: (body: { email: string; password: string; firstName: string; lastName: string }) =>
    apiFetch<AuthTokens>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    apiFetch<AuthTokens>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  verifyEmail: (token: string) =>
    apiFetch<void>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),

  forgotPassword: (email: string) =>
    apiFetch<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    apiFetch<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
};
```

- [ ] **Step 2: Update login/page.tsx**

Replace `lishop-frontend/apps/mfe-auth/src/app/login/page.tsx`:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useState } from 'react';
import { authApi } from '../../lib/auth-api';

const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginForm = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setServerError(null);
    try {
      const result = await authApi.login(data);
      // Store access token for shell to pick up via postMessage or localStorage flag
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lishop_at', result.accessToken);
        window.dispatchEvent(new CustomEvent('lishop:auth', { detail: { accessToken: result.accessToken } }));
      }
      setSuccess(true);
      setTimeout(() => { window.location.href = 'http://localhost:3000'; }, 500);
    } catch (e) {
      setServerError((e as Error).message);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-green-600">Đăng nhập thành công! Đang chuyển hướng...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Đăng nhập</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {serverError && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <Link href="/forgot-password" className="hover:text-indigo-600">
            Quên mật khẩu?
          </Link>
          <Link href="/register" className="hover:text-indigo-600">
            Chưa có tài khoản? Đăng ký
          </Link>
        </div>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Hoặc đăng nhập với</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/auth/oauth/google/callback`}
            className="flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Google
          </a>
          <a
            href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/auth/oauth/facebook/callback`}
            className="flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Facebook
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check mfe-auth**

```bash
pnpm --filter @lishop/mfe-auth tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mfe-auth/src/lib/auth-api.ts apps/mfe-auth/src/app/login/page.tsx
git commit -m "feat: add mfe-auth API client and login page with React Hook Form + Zod"
```

---

## Task 15: mfe-auth — remaining pages

**Files:**
- Modify: `lishop-frontend/apps/mfe-auth/src/app/register/page.tsx`
- Create: `lishop-frontend/apps/mfe-auth/src/app/verify-email/page.tsx`
- Create: `lishop-frontend/apps/mfe-auth/src/app/forgot-password/page.tsx`
- Create: `lishop-frontend/apps/mfe-auth/src/app/reset-password/page.tsx`
- Modify: `lishop-frontend/apps/mfe-auth/src/app/layout.tsx`

- [ ] **Step 1: Update register/page.tsx**

Replace `lishop-frontend/apps/mfe-auth/src/app/register/page.tsx`:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useState } from 'react';
import { authApi } from '../../lib/auth-api';

const RegisterSchema = z.object({
  firstName: z.string().min(1, 'Vui lòng nhập tên'),
  lastName: z.string().min(1, 'Vui lòng nhập họ'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(128),
});

type RegisterForm = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
  });

  async function onSubmit(data: RegisterForm) {
    setServerError(null);
    try {
      const result = await authApi.register(data);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lishop_at', result.accessToken);
        window.dispatchEvent(new CustomEvent('lishop:auth', { detail: { accessToken: result.accessToken } }));
      }
      setSuccess(true);
      setTimeout(() => { window.location.href = 'http://localhost:3000'; }, 500);
    } catch (e) {
      setServerError((e as Error).message);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-green-600">Đăng ký thành công! Vui lòng kiểm tra email để xác nhận. Đang chuyển hướng...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Tạo tài khoản</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Họ</label>
              <input
                id="lastName"
                {...register('lastName')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
            </div>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Tên</label>
              <input
                id="firstName"
                {...register('firstName')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {serverError && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-indigo-600 hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create verify-email/page.tsx**

Create `lishop-frontend/apps/mfe-auth/src/app/verify-email/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../lib/auth-api';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setStatus('error'); setError('Token không hợp lệ.'); return; }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((e) => { setStatus('error'); setError((e as Error).message); });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Đang xác nhận email...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Email đã được xác nhận!</h1>
          <p className="mt-2 text-sm text-gray-500">Tài khoản của bạn đã được kích hoạt.</p>
          <Link href="/login" className="mt-6 inline-block rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
        <p className="text-red-600">{error ?? 'Có lỗi xảy ra. Vui lòng thử lại.'}</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create forgot-password/page.tsx**

Create `lishop-frontend/apps/mfe-auth/src/app/forgot-password/page.tsx`:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useState } from 'react';
import { authApi } from '../../lib/auth-api';

const ForgotSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

type ForgotForm = z.infer<typeof ForgotSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotForm>({
    resolver: zodResolver(ForgotSchema),
  });

  async function onSubmit(data: ForgotForm) {
    await authApi.forgotPassword(data.email).catch(() => {});
    setSubmitted(true); // Always show success to avoid leaking emails
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Kiểm tra email của bạn</h1>
          <p className="mt-2 text-sm text-gray-500">
            Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-indigo-600 hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Quên mật khẩu</h1>
        <p className="mb-6 text-sm text-gray-500">Nhập email để nhận link đặt lại mật khẩu.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="text-indigo-600 hover:underline">Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create reset-password/page.tsx**

Create `lishop-frontend/apps/mfe-auth/src/app/reset-password/page.tsx`:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '../../lib/auth-api';

const ResetSchema = z.object({
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(128),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Mật khẩu không khớp',
  path: ['confirm'],
});

type ResetForm = z.infer<typeof ResetSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    resolver: zodResolver(ResetSchema),
  });

  async function onSubmit(data: ResetForm) {
    setServerError(null);
    try {
      await authApi.resetPassword(token, data.password);
      setSuccess(true);
    } catch (e) {
      setServerError((e as Error).message);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Mật khẩu đã được đặt lại!</h1>
          <Link href="/login" className="mt-6 inline-block rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...register('confirm')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm.message}</p>}
          </div>

          {serverError && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update mfe-auth layout.tsx**

Replace `lishop-frontend/apps/mfe-auth/src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Xác thực — Lishop',
  description: 'Đăng nhập hoặc tạo tài khoản Lishop',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Type-check mfe-auth**

```bash
pnpm --filter @lishop/mfe-auth tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add apps/mfe-auth/src/
git commit -m "feat: add mfe-auth register, verify-email, forgot-password, reset-password pages"
```

---

## Self-Review: Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| `POST /auth/register` | Task 11 (AuthController) |
| `POST /auth/login` | Task 11 |
| `POST /auth/logout` with token blacklist | Task 11 + Task 8 |
| `POST /auth/refresh` from httpOnly cookie | Task 11 + Task 9 |
| `GET /auth/me` | Task 11 |
| `POST /auth/verify-email` | Task 11 + Task 8 |
| `POST /auth/forgot-password` | Task 11 + Task 8 |
| `POST /auth/reset-password` | Task 11 + Task 8 |
| Google OAuth callback | Task 10 + Task 11 |
| Facebook OAuth callback | Task 10 + Task 11 |
| Redis token blacklist (`blacklist:token:{jti}`) | Task 8 (AuthService) |
| Redis email verify token (`email_verify:{token}` TTL 24h) | Task 8 |
| Redis password reset token (`pwd_reset:{token}` TTL 1h) | Task 8 |
| BullMQ mail queue | Task 4 |
| nodemailer SMTP processor | Task 4 |
| accessToken in memory (15min) | Task 6 (JwtService) |
| refreshToken in httpOnly cookie (7d) | Task 11 (AuthController) |
| Shell Zustand auth store | Task 12 |
| `useAuth()` hook | Task 12 |
| Shell Header with login/logout | Task 13 |
| mfe-auth login page | Task 14 |
| mfe-auth register page | Task 15 |
| mfe-auth verify-email page | Task 15 |
| mfe-auth forgot-password page | Task 15 |
| mfe-auth reset-password page | Task 15 |
| `AUTH_LOGIN` / `AUTH_LOGOUT` event-bus events | Task 12 (useAuth hook) |
| `@Public()` decorator | Task 9 |
| JwtAuthGuard (global app guard) | Task 9 + Task 11 |
| Class-validator DTOs | Task 7 |

All spec requirements covered. ✓

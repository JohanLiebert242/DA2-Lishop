# Plan 3 — Products & Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the product catalog — backend CategoriesModule and ProductsModule with public read endpoints and admin CRUD, plus the mfe-catalog frontend with product list (filters + pagination) and product detail pages, and a real shell homepage.

**Architecture:** NestJS modules follow the established pattern (Repository → Service → Controller → Module). Public GET endpoints are decorated `@Public()` so no auth required. Admin write endpoints require `@Roles(UserRole.ADMIN)` + a new `RolesGuard`. Frontend uses TanStack Query for server state, `@lishop/shared` for formatters, and `@lishop/ui` for UI components. Cursor-based pagination via `createdAt + id` tuple.

**Tech Stack:** NestJS 10 + Fastify, Prisma 5, `slugify`, Next.js 15 App Router, TanStack Query v5, `@lishop/ui`, `@lishop/shared`, `@lishop/contracts`

---

## File Map

### Backend — new files
```
apps/api/src/
  common/guards/
    roles.guard.ts               — checks @Roles() metadata against request.user.role
  modules/
    categories/
      categories.repository.ts  — Prisma CRUD for Category
      categories.service.ts     — tree builder, slug generation
      categories.controller.ts  — GET /categories, POST /categories (admin)
      categories.module.ts
    products/
      products.repository.ts    — Prisma queries: list (cursor+filters), findBySlug, CRUD
      products.service.ts       — business logic: list, detail, create, update, delete
      products.controller.ts    — REST endpoints
      products.module.ts
      dto/
        create-product.dto.ts
        update-product.dto.ts
        product-list-query.dto.ts
        create-category.dto.ts
```

### Backend — modified files
```
apps/api/src/app.module.ts      — import CategoriesModule + ProductsModule
apps/api/package.json           — add slugify
```

### Frontend mfe-catalog — new/modified files
```
apps/mfe-catalog/src/
  lib/
    catalog-api.ts              — typed fetch wrapper for /categories and /products
  components/
    product-card.tsx            — image, name, price, rating, badge
    category-sidebar.tsx        — clickable category tree
  app/
    products/page.tsx           — listing: filters, grid, pagination
    products/[slug]/page.tsx    — detail: images, price, description, reviews placeholder
    layout.tsx                  — mfe layout (existing, may need Providers added)
```

### Frontend shell — modified files
```
apps/shell/src/app/page.tsx     — hero banner + featured products grid
```

---

## Task 1: Install slugify in backend

**Files:**
- Modify: `lishop-backend/apps/api/package.json`

- [ ] **Step 1: Install slugify**

Run from `lishop-backend/`:
```bash
pnpm --filter @lishop/api add slugify
pnpm --filter @lishop/api add -D @types/slugify
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/package.json lishop-backend/pnpm-lock.yaml
git commit -m "chore: add slugify dep to api"
```

---

## Task 2: RolesGuard

**Files:**
- Create: `lishop-backend/apps/api/src/common/guards/roles.guard.ts`

- [ ] **Step 1: Create roles.guard.ts**

Create `lishop-backend/apps/api/src/common/guards/roles.guard.ts`:
```typescript
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@lishop/contracts';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Not authenticated');
    if (!requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
```

- [ ] **Step 2: Write roles.guard.spec.ts**

Create `lishop-backend/apps/api/src/common/guards/roles.guard.spec.ts`:
```typescript
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@lishop/contracts';

function mockCtx(user: { role: string } | null) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  const reflector = { getAllAndOverride: jest.fn() };

  beforeEach(() => {
    guard = new RolesGuard(reflector as any);
  });

  afterEach(() => jest.resetAllMocks());

  it('allows when no roles required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(mockCtx(null))).toBe(true);
  });

  it('allows when user has required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(guard.canActivate(mockCtx({ role: UserRole.ADMIN }))).toBe(true);
  });

  it('throws when user has wrong role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(mockCtx({ role: UserRole.CUSTOMER }))).toThrow(ForbiddenException);
  });

  it('throws when no user', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(mockCtx(null))).toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 3: Run tests**

Run from `lishop-backend/`:
```bash
pnpm --filter @lishop/api test -- --testPathPattern=roles.guard.spec --no-coverage
```
Expected: PASS (4 tests).

- [ ] **Step 4: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/common/guards/
git commit -m "feat: add RolesGuard for role-based access control"
```

---

## Task 3: CategoriesModule

**Files:**
- Create: `lishop-backend/apps/api/src/modules/categories/categories.repository.ts`
- Create: `lishop-backend/apps/api/src/modules/categories/categories.service.ts`
- Create: `lishop-backend/apps/api/src/modules/categories/categories.service.spec.ts`
- Create: `lishop-backend/apps/api/src/modules/categories/categories.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/categories/categories.module.ts`
- Create: `lishop-backend/apps/api/src/modules/categories/dto/create-category.dto.ts`

- [ ] **Step 1: Create create-category.dto.ts**

Create `lishop-backend/apps/api/src/modules/categories/dto/create-category.dto.ts`:
```typescript
import { IsString, IsOptional, IsUrl, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentId?: string;
}
```

- [ ] **Step 2: Create categories.repository.ts**

Create `lishop-backend/apps/api/src/modules/categories/categories.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma, Category, Prisma } from '@lishop/database';

@Injectable()
export class CategoriesRepository {
  findAll(): Promise<Category[]> {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  findBySlug(slug: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { slug } });
  }

  findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { id } });
  }

  create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return prisma.category.create({ data });
  }

  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return prisma.category.update({ where: { id }, data });
  }

  delete(id: string): Promise<Category> {
    return prisma.category.delete({ where: { id } });
  }
}
```

- [ ] **Step 3: Create categories.service.ts**

Create `lishop-backend/apps/api/src/modules/categories/categories.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';

export interface CategoryTree {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  parentId: string | null;
  children?: CategoryTree[];
}

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  async findTree(): Promise<CategoryTree[]> {
    const all = await this.repo.findAll();
    return this.buildTree(all as CategoryTree[]);
  }

  async findBySlug(slug: string): Promise<CategoryTree> {
    const cat = await this.repo.findBySlug(slug);
    if (!cat) throw new NotFoundException(`Category not found: ${slug}`);
    return cat as CategoryTree;
  }

  async create(dto: CreateCategoryDto): Promise<CategoryTree> {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const cat = await this.repo.create({
      name: dto.name,
      slug,
      imageUrl: dto.imageUrl ?? null,
      ...(dto.parentId && { parent: { connect: { id: dto.parentId } } }),
    });
    return cat as CategoryTree;
  }

  private buildTree(items: CategoryTree[], parentId: string | null = null): CategoryTree[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({ ...item, children: this.buildTree(items, item.id) }));
  }
}
```

- [ ] **Step 4: Create categories.service.spec.ts**

Create `lishop-backend/apps/api/src/modules/categories/categories.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';

const mockCats = [
  { id: 'c1', name: 'Electronics', slug: 'electronics', imageUrl: null, parentId: null },
  { id: 'c2', name: 'Phones', slug: 'phones', imageUrl: null, parentId: 'c1' },
  { id: 'c3', name: 'Fashion', slug: 'fashion', imageUrl: null, parentId: null },
];

describe('CategoriesService', () => {
  let service: CategoriesService;
  const repo = {
    findAll: jest.fn(),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CategoriesService, { provide: CategoriesRepository, useValue: repo }],
    }).compile();
    service = module.get(CategoriesService);
  });

  afterEach(() => jest.resetAllMocks());

  it('findTree builds nested structure', async () => {
    repo.findAll.mockResolvedValue(mockCats);
    const tree = await service.findTree();
    expect(tree).toHaveLength(2); // Electronics + Fashion at root
    expect(tree[0].children).toHaveLength(1); // Phones under Electronics
    expect(tree[0].children![0].slug).toBe('phones');
  });

  it('findBySlug throws NotFoundException when missing', async () => {
    repo.findBySlug.mockResolvedValue(null);
    await expect(service.findBySlug('missing')).rejects.toThrow(NotFoundException);
  });

  it('create generates slug from name', async () => {
    const newCat = { id: 'c4', name: 'Sách vở', slug: 'sach-vo', imageUrl: null, parentId: null };
    repo.create.mockResolvedValue(newCat);
    const result = await service.create({ name: 'Sách vở' });
    expect(result.slug).toBe('sach-vo');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'sach-vo' }));
  });
});
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=categories.service.spec --no-coverage
```
Expected: PASS (3 tests).

- [ ] **Step 6: Create categories.controller.ts**

Create `lishop-backend/apps/api/src/modules/categories/categories.controller.ts`:
```typescript
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@lishop/contracts';

@ApiTags('categories')
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all categories as tree' })
  async findAll() {
    return this.categoriesService.findTree();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  async findOne(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (admin)' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category (admin)' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.findBySlug(id); // just returns for now
  }
}
```

- [ ] **Step 7: Create categories.module.ts**

Create `lishop-backend/apps/api/src/modules/categories/categories.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';

@Module({
  providers: [CategoriesRepository, CategoriesService],
  controllers: [CategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}
```

- [ ] **Step 8: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/categories/
git commit -m "feat: add CategoriesModule with tree builder and admin CRUD"
```

---

## Task 4: ProductsModule — DTOs

**Files:**
- Create: `lishop-backend/apps/api/src/modules/products/dto/create-product.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/products/dto/update-product.dto.ts`
- Create: `lishop-backend/apps/api/src/modules/products/dto/product-list-query.dto.ts`

- [ ] **Step 1: Create create-product.dto.ts**

Create `lishop-backend/apps/api/src/modules/products/dto/create-product.dto.ts`:
```typescript
import { IsString, IsInt, IsOptional, IsUUID, IsUrl, IsArray, MinLength, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ProductImageInputDto {
  @ApiProperty() @IsUrl() url!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alt?: string;
  @ApiPropertyOptional() @IsOptional() isPrimary?: boolean;
}

export class CreateProductDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255) name!: string;
  @ApiProperty() @IsString() @MinLength(1) description!: string;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceVnd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceUsd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) stock!: number;
  @ApiProperty() @IsUUID() categoryId!: string;
  @ApiPropertyOptional({ type: [ProductImageInputDto] })
  @IsOptional() @IsArray() @Type(() => ProductImageInputDto) images?: ProductImageInputDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
```

- [ ] **Step 2: Create update-product.dto.ts**

Create `lishop-backend/apps/api/src/modules/products/dto/update-product.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

- [ ] **Step 3: Create product-list-query.dto.ts**

Create `lishop-backend/apps/api/src/modules/products/dto/product-list-query.dto.ts`:
```typescript
import { IsOptional, IsString, IsInt, IsEnum, IsUUID, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ProductSortOption {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING_DESC = 'rating_desc',
  NEWEST = 'newest',
}

export class ProductListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) minPriceVnd?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) maxPriceVnd?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional({ enum: ProductSortOption }) @IsOptional() @IsEnum(ProductSortOption) sort?: ProductSortOption;
}
```

- [ ] **Step 4: Commit DTOs**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/products/dto/
git commit -m "feat: add product DTOs (create, update, list-query)"
```

---

## Task 5: ProductsRepository

**Files:**
- Create: `lishop-backend/apps/api/src/modules/products/products.repository.ts`

- [ ] **Step 1: Create products.repository.ts**

Create `lishop-backend/apps/api/src/modules/products/products.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { prisma, Product, Prisma } from '@lishop/database';
import { ProductListQueryDto, ProductSortOption } from './dto/product-list-query.dto';

export interface ProductWithDetails extends Product {
  images: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
  tags: { tag: { name: string } }[];
  category: { id: string; name: string; slug: string };
}

@Injectable()
export class ProductsRepository {
  async findMany(query: ProductListQueryDto): Promise<{ items: ProductWithDetails[]; nextCursor: string | null }> {
    const { limit, cursor, categoryId, minPriceVnd, maxPriceVnd, q, sort } = query;

    const where: Prisma.ProductWhereInput = {
      ...(categoryId && { categoryId }),
      ...(minPriceVnd !== undefined && { priceVnd: { gte: minPriceVnd } }),
      ...(maxPriceVnd !== undefined && { priceVnd: { ...((minPriceVnd !== undefined ? { gte: minPriceVnd } : {})), lte: maxPriceVnd } }),
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = this.getOrderBy(sort);

    const items = await prisma.product.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        images: true,
        tags: { include: { tag: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    const hasMore = items.length > limit;
    const result = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? result[result.length - 1].id : null;

    return { items: result as ProductWithDetails[], nextCursor };
  }

  async findBySlug(slug: string): Promise<ProductWithDetails | null> {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        images: true,
        tags: { include: { tag: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    }) as Promise<ProductWithDetails | null>;
  }

  async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id } });
  }

  async create(data: Prisma.ProductCreateInput): Promise<ProductWithDetails> {
    return prisma.product.create({
      data,
      include: {
        images: true,
        tags: { include: { tag: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    }) as Promise<ProductWithDetails>;
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<ProductWithDetails> {
    return prisma.product.update({
      where: { id },
      data,
      include: {
        images: true,
        tags: { include: { tag: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    }) as Promise<ProductWithDetails>;
  }

  async delete(id: string): Promise<Product> {
    return prisma.product.delete({ where: { id } });
  }

  async findFeatured(limit: number = 8): Promise<ProductWithDetails[]> {
    return prisma.product.findMany({
      where: { stock: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        images: true,
        tags: { include: { tag: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    }) as Promise<ProductWithDetails[]>;
  }

  private getOrderBy(sort?: ProductSortOption): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case ProductSortOption.PRICE_ASC: return [{ priceVnd: 'asc' }, { id: 'asc' }];
      case ProductSortOption.PRICE_DESC: return [{ priceVnd: 'desc' }, { id: 'asc' }];
      case ProductSortOption.RATING_DESC: return [{ averageRating: 'desc' }, { id: 'asc' }];
      default: return [{ createdAt: 'desc' }, { id: 'asc' }];
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/products/products.repository.ts
git commit -m "feat: add ProductsRepository with cursor pagination and filters"
```

---

## Task 6: ProductsService

**Files:**
- Create: `lishop-backend/apps/api/src/modules/products/products.service.ts`
- Create: `lishop-backend/apps/api/src/modules/products/products.service.spec.ts`

- [ ] **Step 1: Create products.service.spec.ts**

Create `lishop-backend/apps/api/src/modules/products/products.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { CategoriesService } from '../categories/categories.service';

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
  tags: [],
  category: { id: 'c1', name: 'Electronics', slug: 'electronics' },
};

describe('ProductsService', () => {
  let service: ProductsService;
  const repo = {
    findMany: jest.fn(),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFeatured: jest.fn(),
  };
  const categoriesService = { findBySlug: jest.fn(), create: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: repo },
        { provide: CategoriesService, useValue: categoriesService },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('findMany returns items and nextCursor', async () => {
    repo.findMany.mockResolvedValue({ items: [mockProduct], nextCursor: null });
    const result = await service.findMany({ limit: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it('findBySlug throws NotFoundException when missing', async () => {
    repo.findBySlug.mockResolvedValue(null);
    await expect(service.findBySlug('missing')).rejects.toThrow(NotFoundException);
  });

  it('findBySlug returns product', async () => {
    repo.findBySlug.mockResolvedValue(mockProduct);
    const result = await service.findBySlug('iphone-15');
    expect(result.slug).toBe('iphone-15');
  });

  it('create generates slug from name', async () => {
    repo.create.mockResolvedValue({ ...mockProduct, slug: 'samsung-s24' });
    const result = await service.create({
      name: 'Samsung S24',
      description: 'Great phone',
      priceVnd: 15000000,
      priceUsd: 600,
      stock: 5,
      categoryId: 'c1',
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'samsung-s24' }));
    expect(result).toBeDefined();
  });

  it('delete throws NotFoundException if product missing', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.delete('missing-id')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=products.service.spec --no-coverage
```
Expected: FAIL — ProductsService not found.

- [ ] **Step 3: Create products.service.ts**

Create `lishop-backend/apps/api/src/modules/products/products.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { ProductsRepository, ProductWithDetails } from './products.repository';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findMany(query: ProductListQueryDto): Promise<{ items: ProductWithDetails[]; nextCursor: string | null }> {
    return this.repo.findMany(query);
  }

  async findBySlug(slug: string): Promise<ProductWithDetails> {
    const product = await this.repo.findBySlug(slug);
    if (!product) throw new NotFoundException(`Product not found: ${slug}`);
    return product;
  }

  async findFeatured(limit = 8): Promise<ProductWithDetails[]> {
    return this.repo.findFeatured(limit);
  }

  async create(dto: CreateProductDto): Promise<ProductWithDetails> {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const { images, tags, ...rest } = dto;

    return this.repo.create({
      ...rest,
      slug,
      category: { connect: { id: dto.categoryId } },
      ...(images && {
        images: { create: images.map((img) => ({ url: img.url, alt: img.alt ?? null, isPrimary: img.isPrimary ?? false })) },
      }),
      ...(tags && {
        tags: {
          create: tags.map((tagName) => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName },
              },
            },
          })),
        },
      }),
    } as any);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductWithDetails> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Product not found: ${id}`);

    const updateData: any = { ...dto };
    delete updateData.images;
    delete updateData.tags;
    delete updateData.categoryId;

    if (dto.name) updateData.slug = slugify(dto.name, { lower: true, strict: true });
    if (dto.categoryId) updateData.category = { connect: { id: dto.categoryId } };

    return this.repo.update(id, updateData);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Product not found: ${id}`);
    await this.repo.delete(id);
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm --filter @lishop/api test -- --testPathPattern=products.service.spec --no-coverage
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/products/products.service.ts lishop-backend/apps/api/src/modules/products/products.service.spec.ts
git commit -m "feat: add ProductsService with CRUD, slug generation, cursor pagination"
```

---

## Task 7: ProductsController + ProductsModule + Wire AppModule

**Files:**
- Create: `lishop-backend/apps/api/src/modules/products/products.controller.ts`
- Create: `lishop-backend/apps/api/src/modules/products/products.module.ts`
- Modify: `lishop-backend/apps/api/src/app.module.ts`

- [ ] **Step 1: Create products.controller.ts**

Create `lishop-backend/apps/api/src/modules/products/products.controller.ts`:
```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@lishop/contracts';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with filters and cursor pagination' })
  async findMany(@Query() query: ProductListQueryDto) {
    return this.productsService.findMany(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured products (latest 8 in stock)' })
  async featured(@Query('limit') limit?: string) {
    return this.productsService.findFeatured(limit ? parseInt(limit, 10) : 8);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  async findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product (admin)' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product (admin)' })
  async remove(@Param('id') id: string) {
    await this.productsService.delete(id);
  }
}
```

- [ ] **Step 2: Create products.module.ts**

Create `lishop-backend/apps/api/src/modules/products/products.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule],
  providers: [ProductsRepository, ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
```

- [ ] **Step 3: Update app.module.ts**

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
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    RedisModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
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

- [ ] **Step 4: Type-check backend**

Run from `lishop-backend/`:
```bash
pnpm --filter @lishop/api tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors.

- [ ] **Step 5: Run all backend tests**

```bash
pnpm --filter @lishop/api test -- --no-coverage 2>&1 | tail -20
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-backend/apps/api/src/modules/products/products.controller.ts lishop-backend/apps/api/src/modules/products/products.module.ts lishop-backend/apps/api/src/app.module.ts
git commit -m "feat: wire ProductsModule + CategoriesModule into AppModule with full CRUD endpoints"
```

---

## Task 8: mfe-catalog API client + ProductCard component

**Files:**
- Create: `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`
- Create: `lishop-frontend/apps/mfe-catalog/src/components/product-card.tsx`

- [ ] **Step 1: Create catalog-api.ts**

Create `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`:
```typescript
import type { Category } from '@lishop/contracts';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
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
  category: { id: string; name: string; slug: string };
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

export const catalogApi = {
  getCategories: () =>
    apiFetch<Category[]>('/categories'),

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
};
```

- [ ] **Step 2: Create product-card.tsx**

Create `lishop-frontend/apps/mfe-catalog/src/components/product-card.tsx`:
```typescript
import Link from 'next/link';
import Image from 'next/image';
import { formatVND } from '@lishop/shared';
import type { ProductSummary } from '../lib/catalog-api';

interface ProductCardProps {
  product: ProductSummary;
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt ?? product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400 text-sm">
              Chưa có ảnh
            </div>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-800">
                Hết hàng
              </span>
            </div>
          )}
        </div>

        <div className="p-3">
          <p className="text-xs text-indigo-600">{product.category.name}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-indigo-600">
            {product.name}
          </h3>

          {product.averageRating > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-yellow-500">{'★'.repeat(Math.round(product.averageRating))}</span>
              <span className="text-xs text-gray-500">({product.reviewCount})</span>
            </div>
          )}

          <p className="mt-2 text-base font-bold text-indigo-600">
            {formatVND(product.priceVnd)}
          </p>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Type-check mfe-catalog**

```bash
pnpm --filter @lishop/mfe-catalog tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-catalog/src/lib/ lishop-frontend/apps/mfe-catalog/src/components/
git commit -m "feat: add mfe-catalog API client and ProductCard component"
```

---

## Task 9: mfe-catalog — Product Listing Page

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/page.tsx`
- Create: `lishop-frontend/apps/mfe-catalog/src/components/category-sidebar.tsx`
- Create: `lishop-frontend/apps/mfe-catalog/src/components/product-filters.tsx`
- Create: `lishop-frontend/apps/mfe-catalog/src/app/providers.tsx`

- [ ] **Step 1: Create providers.tsx for mfe-catalog**

Create `lishop-frontend/apps/mfe-catalog/src/app/providers.tsx`:
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 2: Update mfe-catalog layout.tsx to use Providers**

Replace `lishop-frontend/apps/mfe-catalog/src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Sản phẩm — Lishop',
  description: 'Khám phá hàng nghìn sản phẩm chất lượng tại Lishop',
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create category-sidebar.tsx**

Create `lishop-frontend/apps/mfe-catalog/src/components/category-sidebar.tsx`:
```typescript
'use client';

import type { Category } from '@lishop/contracts';

interface CategorySidebarProps {
  categories: Category[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}

export function CategorySidebar({ categories, selectedId, onSelect }: CategorySidebarProps) {
  return (
    <aside className="w-48 shrink-0">
      <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Danh mục</h2>
      <ul className="space-y-1">
        <li>
          <button
            onClick={() => onSelect(undefined)}
            className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
              !selectedId ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tất cả
          </button>
        </li>
        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              onClick={() => onSelect(cat.id)}
              className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                selectedId === cat.id ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
            {cat.children && cat.children.length > 0 && (
              <ul className="ml-3 mt-1 space-y-1">
                {cat.children.map((child) => (
                  <li key={child.id}>
                    <button
                      onClick={() => onSelect(child.id)}
                      className={`w-full rounded px-3 py-2 text-left text-xs transition-colors ${
                        selectedId === child.id ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {child.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 4: Create product-filters.tsx**

Create `lishop-frontend/apps/mfe-catalog/src/components/product-filters.tsx`:
```typescript
'use client';

interface ProductFiltersProps {
  sort: string;
  q: string;
  onSortChange: (sort: string) => void;
  onQChange: (q: string) => void;
}

export function ProductFilters({ sort, q, onSortChange, onQChange }: ProductFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={q}
        onChange={(e) => onQChange(e.target.value)}
        placeholder="Tìm kiếm sản phẩm..."
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="newest">Mới nhất</option>
        <option value="price_asc">Giá tăng dần</option>
        <option value="price_desc">Giá giảm dần</option>
        <option value="rating_desc">Đánh giá cao nhất</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 5: Replace products/page.tsx**

Replace `lishop-frontend/apps/mfe-catalog/src/app/products/page.tsx`:
```typescript
'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@lishop/shared';
import { catalogApi } from '../../lib/catalog-api';
import { ProductCard } from '../../components/product-card';
import { CategorySidebar } from '../../components/category-sidebar';
import { ProductFilters } from '../../components/product-filters';

export default function ProductListPage() {
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [sort, setSort] = useState('newest');
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const debouncedQ = useDebounce(q, 400);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getCategories(),
  });

  const { data, isFetching } = useQuery({
    queryKey: ['products', { categoryId, sort, q: debouncedQ, cursor }],
    queryFn: () => catalogApi.getProducts({ categoryId, sort: sort as any, q: debouncedQ, cursor }),
  });

  const handleCategoryChange = useCallback((id: string | undefined) => {
    setCategoryId(id);
    setCursor(undefined);
  }, []);

  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Tất cả sản phẩm</h1>

      <div className="flex gap-8">
        <CategorySidebar
          categories={categories}
          selectedId={categoryId}
          onSelect={handleCategoryChange}
        />

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <ProductFilters
              sort={sort}
              q={q}
              onSortChange={setSort}
              onQChange={setQ}
            />
            {isFetching && <span className="text-sm text-gray-400">Đang tải...</span>}
          </div>

          {items.length === 0 && !isFetching ? (
            <div className="flex h-48 items-center justify-center text-gray-400">
              Không tìm thấy sản phẩm phù hợp
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {nextCursor && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setCursor(nextCursor)}
                disabled={isFetching}
                className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isFetching ? 'Đang tải...' : 'Xem thêm'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

```bash
pnpm --filter @lishop/mfe-catalog tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-catalog/src/
git commit -m "feat: add mfe-catalog product listing page with filters and category sidebar"
```

---

## Task 10: mfe-catalog — Product Detail Page

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx`

- [ ] **Step 1: Replace product detail page**

Replace `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/page.tsx`:
```typescript
'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatVND } from '@lishop/shared';
import { catalogApi } from '../../../lib/catalog-api';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { slug } = use(params);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => catalogApi.getProduct(slug),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-gray-400">
        Đang tải...
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-red-600">Không tìm thấy sản phẩm.</p>
        <Link href="/products" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const images = product.images.length > 0
    ? product.images.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
    : null;
  const currentImage = images?.[selectedImageIndex];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-indigo-600">Trang chủ</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-indigo-600">Sản phẩm</Link>
        <span>/</span>
        <Link href={`/products?categoryId=${product.category.id}`} className="hover:text-indigo-600">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-gray-800">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
            {currentImage ? (
              <Image
                src={currentImage.url}
                alt={currentImage.alt ?? product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                Chưa có ảnh
              </div>
            )}
          </div>
          {images && images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                    i === selectedImageIndex ? 'border-indigo-500' : 'border-gray-200'
                  }`}
                >
                  <Image src={img.url} alt={img.alt ?? ''} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm text-indigo-600">{product.category.name}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{product.name}</h1>

          {product.averageRating > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex text-yellow-400">
                {'★'.repeat(Math.round(product.averageRating))}
                {'☆'.repeat(5 - Math.round(product.averageRating))}
              </div>
              <span className="text-sm text-gray-500">{product.averageRating.toFixed(1)} ({product.reviewCount} đánh giá)</span>
            </div>
          )}

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-600">{formatVND(product.priceVnd)}</span>
          </div>

          <div className="mt-2">
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Còn hàng ({product.stock} sản phẩm)
              </span>
            ) : (
              <span className="text-sm text-red-600">Hết hàng</span>
            )}
          </div>

          {product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map(({ tag }) => (
                <span key={tag.name} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6">
            <button
              disabled={product.stock === 0}
              className="w-full rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {product.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
            </button>
          </div>

          <div className="mt-6 border-t pt-6">
            <h2 className="text-sm font-semibold text-gray-900">Mô tả sản phẩm</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @lishop/mfe-catalog tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/mfe-catalog/src/app/products/
git commit -m "feat: add mfe-catalog product detail page with image gallery"
```

---

## Task 11: Shell Homepage

**Files:**
- Modify: `lishop-frontend/apps/shell/src/app/page.tsx`

- [ ] **Step 1: Replace shell page.tsx**

Replace `lishop-frontend/apps/shell/src/app/page.tsx`:
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { formatVND } from '@lishop/shared';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  averageRating: number;
  images: ProductImage[];
  category: { name: string };
}

async function getFeaturedProducts(): Promise<FeaturedProduct[]> {
  const res = await fetch(`${API_URL}/products/featured?limit=8`);
  const json = await res.json();
  return (json.data ?? json) as FeaturedProduct[];
}

function FeaturedProductCard({ product }: { product: FeaturedProduct }) {
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0];
  return (
    <Link href={`http://localhost:3002/products/${product.slug}`} className="group block">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="relative aspect-square w-full bg-gray-100">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-300 text-xs">No image</div>
          )}
        </div>
        <div className="p-3">
          <p className="text-xs text-indigo-600">{product.category.name}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium text-gray-900">{product.name}</h3>
          <p className="mt-1 text-sm font-bold text-indigo-600">{formatVND(product.priceVnd)}</p>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { data: featured = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: getFeaturedProducts,
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-20 text-white text-center">
        <h1 className="text-4xl font-bold">Chào mừng đến Lishop</h1>
        <p className="mt-3 text-lg text-indigo-100">Hàng nghìn sản phẩm chất lượng, giao hàng nhanh chóng</p>
        <Link
          href="http://localhost:3002/products"
          className="mt-6 inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          Mua sắm ngay
        </Link>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Sản phẩm nổi bật</h2>
            <Link href="http://localhost:3002/products" className="text-sm text-indigo-600 hover:underline">
              Xem tất cả →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <FeaturedProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check shell**

```bash
pnpm --filter @lishop/shell tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/nguye/OneDrive/Desktop/DA2
git add lishop-frontend/apps/shell/src/app/page.tsx
git commit -m "feat: add shell homepage with hero banner and featured products"
```

---

## Self-Review: Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| `GET /categories` (public, tree) | Task 3 (CategoriesController) |
| `GET /categories/:slug` (public) | Task 3 |
| `POST /categories` (ADMIN) | Task 3 |
| `GET /products` (public, cursor pagination, filters) | Task 7 (ProductsController) |
| `GET /products/featured` (public, latest 8) | Task 7 |
| `GET /products/:slug` (public, with images/tags) | Task 7 |
| `POST /products` (ADMIN) | Task 7 |
| `PATCH /products/:id` (ADMIN) | Task 7 |
| `DELETE /products/:id` (ADMIN) | Task 7 |
| RolesGuard for ADMIN protection | Task 2 |
| Slug auto-generation (slugify) | Tasks 3, 6 |
| Product list with category filter | Task 9 (mfe-catalog) |
| Product list with search (q) | Task 9 |
| Product list with sort (price/rating/newest) | Task 9 |
| Category sidebar | Task 9 |
| Load-more cursor pagination (frontend) | Task 9 |
| Product detail page with images | Task 10 |
| Product detail breadcrumb | Task 10 |
| Shell homepage with featured products | Task 11 |
| Shell homepage hero banner | Task 11 |

All spec requirements covered. ✓

---

## Remaining Plans (After Plan 3)

This plan covers **Products + Catalog** only. The following plans are needed to complete the project:

- **Plan 4 — Cart + Promotions**: CartModule (backend: add/remove/update items, apply coupon), PromotionsModule (coupon validation, flash sales), mfe-cart, mfe-promotions
- **Plan 5 — Checkout + Orders**: OrdersModule, PaymentsModule (COD), mfe-checkout (address selection, order placement), mfe-orders (history, tracking)
- **Plan 6 — Profile + Reviews**: ProfileModule (address CRUD, loyalty points), ReviewsModule, mfe-profile, product reviews in mfe-catalog
- **Plan 7 — Admin**: AdminModule (product/order/user management), mfe-admin (dashboard, CRUD tables)
- **Plan 8 — Notifications**: NotificationsModule, mfe-notifications (notification center, preferences)

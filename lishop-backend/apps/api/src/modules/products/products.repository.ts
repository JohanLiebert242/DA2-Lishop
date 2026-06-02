import { Injectable } from '@nestjs/common';
import { prisma, Product, ProductVariant, Prisma } from '@lishop/database';
import { ProductListQueryDto, ProductSortOption } from './dto/product-list-query.dto';


export interface ProductWithDetails extends Product {
  images: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
  tags: { tagId: string; tag: { name: string } }[];
  category: { id: string; name: string; slug: string };
  variants: ProductVariant[];
}

const PRODUCT_INCLUDE = {
  images: true,
  tags: { include: { tag: true } },
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsRepository {
  async findMany(query: ProductListQueryDto): Promise<{ items: ProductWithDetails[]; nextCursor: string | null }> {
    const {
      limit,
      cursor,
      categoryId,
      minPriceVnd,
      maxPriceVnd,
      q,
      sort,
      brand,
      minRating,
      inStock,
      onSale,
      freeShipping,
    } = query;

    const priceFilter: Prisma.IntFilter = {
      ...(minPriceVnd !== undefined && { gte: minPriceVnd }),
      ...(maxPriceVnd !== undefined && { lte: maxPriceVnd }),
    };

    if (freeShipping) {
      priceFilter.gte = Math.max(priceFilter.gte ?? 0, 500_000);
    }

    const textFilters: Prisma.ProductWhereInput[] = [];

    if (q) {
      textFilters.push({
        OR: [
          { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: q, mode: Prisma.QueryMode.insensitive } },
        ],
      });
    }

    if (brand) {
      textFilters.push({
        OR: [
          { name: { contains: brand, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: brand, mode: Prisma.QueryMode.insensitive } },
        ],
      });
    }

    const where: Prisma.ProductWhereInput = {
      ...(categoryId && { categoryId }),
      ...(Object.keys(priceFilter).length > 0 && { priceVnd: priceFilter }),
      ...(minRating !== undefined && { averageRating: { gte: minRating } }),
      ...(inStock && { stock: { gt: 0 } }),
      ...(onSale && { tags: { some: { tag: { name: { equals: 'sale', mode: Prisma.QueryMode.insensitive } } } } }),
      ...(textFilters.length > 0 && { AND: textFilters }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = this.getOrderBy(sort);

    const items = await prisma.product.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: PRODUCT_INCLUDE,
    });

    const hasMore = items.length > limit;
    const result = hasMore ? items.slice(0, limit) : items;
    const lastItem = result[result.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.id : null;

    return { items: result as ProductWithDetails[], nextCursor };
  }

  async findBySlug(slug: string): Promise<ProductWithDetails | null> {
    return prisma.product.findUnique({
      where: { slug },
      include: PRODUCT_INCLUDE,
    }) as Promise<ProductWithDetails | null>;
  }

  async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id } });
  }

  async create(data: Prisma.ProductCreateInput): Promise<ProductWithDetails> {
    return prisma.product.create({
      data,
      include: PRODUCT_INCLUDE,
    }) as Promise<ProductWithDetails>;
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<ProductWithDetails> {
    return prisma.product.update({
      where: { id },
      data,
      include: PRODUCT_INCLUDE,
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
      include: PRODUCT_INCLUDE,
    }) as Promise<ProductWithDetails[]>;
  }

  async findRelated(
    productId: string,
    categoryId: string,
    tagIds: string[],
    limit = 6,
  ): Promise<ProductWithDetails[]> {
    const baseWhere = { categoryId, id: { not: productId }, stock: { gt: 0 } };

    if (tagIds.length === 0) {
      return prisma.product.findMany({
        where: baseWhere,
        take: limit,
        orderBy: { averageRating: 'desc' },
        include: PRODUCT_INCLUDE,
      }) as Promise<ProductWithDetails[]>;
    }

    // Prefer products that share at least one tag, ordered by rating
    const withTags = await prisma.product.findMany({
      where: { ...baseWhere, tags: { some: { tagId: { in: tagIds } } } },
      take: limit,
      orderBy: { averageRating: 'desc' },
      include: PRODUCT_INCLUDE,
    });

    if (withTags.length >= limit) return withTags as ProductWithDetails[];

    // Fill remaining slots from the same category (no tag overlap required)
    const excludeIds = [productId, ...withTags.map((p) => p.id)];
    const filler = await prisma.product.findMany({
      where: { ...baseWhere, id: { notIn: excludeIds } },
      take: limit - withTags.length,
      orderBy: { averageRating: 'desc' },
      include: PRODUCT_INCLUDE,
    });

    return [...withTags, ...filler] as ProductWithDetails[];
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

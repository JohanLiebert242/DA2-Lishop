import { Injectable } from '@nestjs/common';
import { prisma, Shop, ShopStatus, Prisma } from '@lishop/database';

const SHOP_INCLUDE = {
  user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { products: true } },
} satisfies Prisma.ShopInclude;

export type ShopWithDetails = Shop & {
  user: { id: string; email: string; firstName: string; lastName: string; avatarUrl: string | null };
  approvedBy: { id: string; firstName: string; lastName: string } | null;
  _count: { products: number };
};

@Injectable()
export class ShopsRepository {
  async findById(id: string): Promise<ShopWithDetails | null> {
    return prisma.shop.findUnique({ where: { id }, include: SHOP_INCLUDE }) as Promise<ShopWithDetails | null>;
  }

  async findByUserId(userId: string): Promise<ShopWithDetails | null> {
    return prisma.shop.findUnique({ where: { userId }, include: SHOP_INCLUDE }) as Promise<ShopWithDetails | null>;
  }

  async findBySlug(slug: string): Promise<ShopWithDetails | null> {
    return prisma.shop.findUnique({ where: { slug }, include: SHOP_INCLUDE }) as Promise<ShopWithDetails | null>;
  }

  async findAll(status?: ShopStatus): Promise<ShopWithDetails[]> {
    const where: Prisma.ShopWhereInput = {};
    if (status) where.status = status;
    return prisma.shop.findMany({
      where,
      include: SHOP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    }) as Promise<ShopWithDetails[]>;
  }

  async create(data: Prisma.ShopCreateInput): Promise<ShopWithDetails> {
    return prisma.shop.create({ data, include: SHOP_INCLUDE }) as Promise<ShopWithDetails>;
  }

  async update(id: string, data: Prisma.ShopUpdateInput): Promise<ShopWithDetails> {
    return prisma.shop.update({ where: { id }, data, include: SHOP_INCLUDE }) as Promise<ShopWithDetails>;
  }
}

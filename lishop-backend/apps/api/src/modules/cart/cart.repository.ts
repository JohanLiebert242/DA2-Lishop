import { Injectable } from '@nestjs/common';
import { prisma } from '@lishop/database';

export interface CartRow {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    priceVnd: number;
    priceUsd: number;
    stock: number;
    weightGrams: number;
    images: { url: string }[];
  };
}

export interface ProductStockInfo {
  id: string;
  stock: number;
}

@Injectable()
export class CartRepository {
  async findByUserId(userId: string): Promise<CartRow[]> {
    return prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            priceVnd: true,
            priceUsd: true,
            stock: true,
            weightGrams: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }) as Promise<CartRow[]>;
  }

  async addOrUpdate(userId: string, productId: string, quantity: number): Promise<void> {
    await prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, quantity },
      update: { quantity },
    });
  }

  async remove(userId: string, productId: string): Promise<void> {
    await prisma.cartItem.deleteMany({ where: { userId, productId } });
  }

  async clear(userId: string): Promise<void> {
    await prisma.cartItem.deleteMany({ where: { userId } });
  }

  async findProduct(productId: string): Promise<ProductStockInfo | null> {
    return prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma, prisma } from '@lishop/database';

export interface CartRow {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    priceVnd: number;
    priceUsd: number;
    stock: number;
    weightGrams: number;
    shopId: string | null;
    images: { url: string }[];
  };
  variant: {
    id: string;
    productId: string;
    sku: string;
    name: string;
    priceVnd: number;
    priceUsd: number;
    stock: number;
    weightGrams: number;
    attributes: Prisma.JsonValue;
    imageUrl: string | null;
    isDefault: boolean;
    isActive: boolean;
  } | null;
}

export interface ProductStockInfo {
  id: string;
  stock: number;
  variants: {
    id: string;
    productId: string;
    sku: string;
    name: string;
    priceVnd: number;
    priceUsd: number;
    stock: number;
    weightGrams: number;
    attributes: Prisma.JsonValue;
    imageUrl: string | null;
    isDefault: boolean;
    isActive: boolean;
  }[];
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
            shopId: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
        variant: {
          select: {
            id: true,
            productId: true,
            sku: true,
            name: true,
            priceVnd: true,
            priceUsd: true,
            stock: true,
            weightGrams: true,
            attributes: true,
            imageUrl: true,
            isDefault: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }) as Promise<CartRow[]>;
  }

  async addOrUpdate(userId: string, productId: string, variantId: string | null, quantity: number): Promise<void> {
    const existing = await prisma.cartItem.findFirst({
      where: { userId, productId, variantId },
      select: { id: true },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity },
      });
      return;
    }

    await prisma.cartItem.create({
      data: { userId, productId, variantId, quantity },
    });
  }

  async remove(userId: string, productId: string, variantId: string | null): Promise<void> {
    await prisma.cartItem.deleteMany({ where: { userId, productId, variantId } });
  }

  async clear(userId: string): Promise<void> {
    await prisma.cartItem.deleteMany({ where: { userId } });
  }

  async findProduct(productId: string): Promise<ProductStockInfo | null> {
    return prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        stock: true,
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            productId: true,
            sku: true,
            name: true,
            priceVnd: true,
            priceUsd: true,
            stock: true,
            weightGrams: true,
            attributes: true,
            imageUrl: true,
            isDefault: true,
            isActive: true,
          },
        },
      },
    });
  }
}

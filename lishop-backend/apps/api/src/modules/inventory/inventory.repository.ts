import { Injectable } from '@nestjs/common';
import { prisma, StockMovementType } from '@lishop/database';

export interface LastMovement {
  type: StockMovementType;
  delta: number;
  createdAt: Date;
}

export interface ProductStockItem {
  id: string;
  name: string;
  slug: string;
  stock: number;
  weightGrams: number;
  isLowStock: boolean;
  lastMovement: LastMovement | null;
}

export interface ProductStockResult {
  id: string;
  name: string;
  stock: number;
  weightGrams: number;
}

export interface StockMovementRecord {
  id: string;
  type: StockMovementType;
  delta: number;
  balanceAfter: number;
  referenceId: string | null;
  note: string | null;
  createdAt: Date;
}

@Injectable()
export class InventoryRepository {
  async findAll(): Promise<ProductStockItem[]> {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
        weightGrams: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { type: true, delta: true, createdAt: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      stock: p.stock,
      weightGrams: p.weightGrams,
      isLowStock: p.stock <= 10,
      lastMovement: p.stockMovements[0] ?? null,
    }));
  }

  async adjustStock(
    productId: string,
    delta: number,
    note?: string,
  ): Promise<ProductStockResult> {
    return prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: delta } },
        select: { id: true, name: true, stock: true, weightGrams: true },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          type: StockMovementType.ADMIN_ADJUSTMENT,
          delta,
          balanceAfter: updatedProduct.stock,
          note: note ?? null,
        },
      });

      return updatedProduct;
    });
  }

  async findMovements(productId: string, limit = 50): Promise<StockMovementRecord[]> {
    return prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        delta: true,
        balanceAfter: true,
        referenceId: true,
        note: true,
        createdAt: true,
      },
    });
  }
}

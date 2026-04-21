import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryRepository, ProductStockItem, ProductStockResult, StockMovementRecord } from './inventory.repository';
import { prisma } from '@lishop/database';

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepo: InventoryRepository) {}

  async getAll(): Promise<ProductStockItem[]> {
    return this.inventoryRepo.findAll();
  }

  async adjustStock(
    productId: string,
    delta: number,
    note?: string,
  ): Promise<ProductStockResult> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    if (product.stock + delta < 0) {
      throw new BadRequestException(
        `Adjustment would bring stock below 0 (current: ${product.stock}, delta: ${delta})`,
      );
    }

    return this.inventoryRepo.adjustStock(productId, delta, note);
  }

  async getMovements(productId: string): Promise<StockMovementRecord[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    return this.inventoryRepo.findMovements(productId);
  }
}

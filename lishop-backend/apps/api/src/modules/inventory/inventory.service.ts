import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryRepository, ProductStockItem, ProductStockResult, StockMovementRecord } from './inventory.repository';
import { RealtimeService } from '../realtime/realtime.service';
import { prisma } from '@lishop/database';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly realtime: RealtimeService,
  ) {}

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

    const result = await this.inventoryRepo.adjustStock(productId, delta, note);

    this.realtime.emitStockUpdate(productId, {
      productId,
      stock: result.stock,
      previousStock: product.stock,
      delta,
      timestamp: new Date().toISOString(),
    });

    return result;
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

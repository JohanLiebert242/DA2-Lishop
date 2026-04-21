import { Injectable } from '@nestjs/common';
import { prisma } from '@lishop/database';

export interface FlashSaleWithItems {
  id: string;
  startAt: Date;
  endAt: Date;
  isActive: boolean;
  items: {
    id: string;
    discountPercent: number;
    product: {
      id: string;
      name: string;
      slug: string;
      priceVnd: number;
      images: { url: string }[];
    };
  }[];
}

const FLASH_SALE_INCLUDE = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          priceVnd: true,
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class FlashSalesRepository {
  async findActive(): Promise<FlashSaleWithItems[]> {
    const now = new Date();
    return prisma.flashSale.findMany({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: FLASH_SALE_INCLUDE,
      orderBy: { startAt: 'desc' },
    });
  }

  findAll(): Promise<FlashSaleWithItems[]> {
    return prisma.flashSale.findMany({
      include: FLASH_SALE_INCLUDE,
      orderBy: { startAt: 'desc' },
    });
  }

  findById(id: string): Promise<FlashSaleWithItems | null> {
    return prisma.flashSale.findUnique({
      where: { id },
      include: FLASH_SALE_INCLUDE,
    });
  }

  create(data: { startAt: Date; endAt: Date; isActive?: boolean }): Promise<FlashSaleWithItems> {
    return prisma.flashSale.create({
      data: {
        startAt: data.startAt,
        endAt: data.endAt,
        isActive: data.isActive ?? true,
      },
      include: FLASH_SALE_INCLUDE,
    });
  }

  update(id: string, data: { startAt?: Date; endAt?: Date; isActive?: boolean }): Promise<FlashSaleWithItems> {
    return prisma.flashSale.update({
      where: { id },
      data,
      include: FLASH_SALE_INCLUDE,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.flashSale.delete({ where: { id } });
  }

  addItem(saleId: string, productId: string, discountPercent: number): Promise<FlashSaleWithItems> {
    return prisma.flashSale.update({
      where: { id: saleId },
      data: {
        items: {
          create: { productId, discountPercent },
        },
      },
      include: FLASH_SALE_INCLUDE,
    });
  }

  removeItem(saleId: string, itemId: string): Promise<FlashSaleWithItems> {
    return prisma.flashSale.update({
      where: { id: saleId },
      data: {
        items: {
          delete: { id: itemId },
        },
      },
      include: FLASH_SALE_INCLUDE,
    });
  }
}

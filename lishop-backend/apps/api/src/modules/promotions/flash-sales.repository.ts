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
      include: {
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
      },
      orderBy: { startAt: 'desc' },
    });
  }
}

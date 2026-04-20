import { Injectable } from '@nestjs/common';
import { prisma } from '@lishop/database';

@Injectable()
export class WishlistRepository {
  async findIdsByUserId(userId: string): Promise<string[]> {
    const items = await prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });
    return items.map((item) => item.productId);
  }

  async findProductsByUserId(userId: string) {
    const items = await prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: true,
            tags: { include: { tag: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    return items.map((item) => item.product);
  }

  async exists(userId: string, productId: string): Promise<boolean> {
    const item = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return !!item;
  }

  async create(userId: string, productId: string) {
    return prisma.wishlist.create({ data: { userId, productId } });
  }

  async delete(userId: string, productId: string) {
    return prisma.wishlist.delete({
      where: { userId_productId: { userId, productId } },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { prisma, Review, ReviewStatus, OrderStatus, Prisma } from '@lishop/database';

export interface ReviewWithUser {
  id: string;
  userId: string;
  userName: string | undefined;
  rating: number;
  content: string;
  verifiedPurchase: boolean;
  createdAt: Date;
}

@Injectable()
export class ReviewsRepository {
  async findByProductId(productId: string): Promise<ReviewWithUser[]> {
    const reviews = await prisma.review.findMany({
      where: { productId, status: ReviewStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    return reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName:
        r.user.firstName && r.user.lastName
          ? `${r.user.firstName} ${r.user.lastName}`
          : r.user.email.split('@')[0],
      rating: r.rating,
      content: r.content,
      verifiedPurchase: r.verifiedPurchase,
      createdAt: r.createdAt,
    }));
  }

  findByProductIdAndUserId(productId: string, userId: string): Promise<Review | null> {
    return prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
    });
  }

  async hasDeliveredOrderWithProduct(userId: string, productId: string): Promise<boolean> {
    const item = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: OrderStatus.DELIVERED },
      },
    });
    return !!item;
  }

  create(data: Prisma.ReviewCreateInput): Promise<Review> {
    return prisma.review.create({ data });
  }
}

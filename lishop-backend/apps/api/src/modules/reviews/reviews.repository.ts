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

export interface AdminReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  content: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  createdAt: Date;
  product: { name: string; slug: string };
  user: { email: string; firstName: string; lastName: string };
}

@Injectable()
export class ReviewsRepository {
  async findByProductId(productId: string): Promise<ReviewWithUser[]> {
    const reviews = await prisma.review.findMany({
      where: { productId, status: ReviewStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      take: 100,
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

  findById(id: string): Promise<Review | null> {
    return prisma.review.findUnique({ where: { id } });
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

  async updateOwnedReview(
    userId: string,
    id: string,
    data: Prisma.ReviewUpdateInput,
  ): Promise<Review> {
    await prisma.review.updateMany({
      where: { id, userId },
      data,
    });

    return prisma.review.findUniqueOrThrow({ where: { id } });
  }

  async refreshProductReviewStats(productId: string): Promise<void> {
    const aggregate = await prisma.review.aggregate({
      where: { productId, status: ReviewStatus.APPROVED },
      _avg: { rating: true },
      _count: { id: true },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: aggregate._avg.rating ?? 0,
        reviewCount: aggregate._count.id,
      },
    });
  }

  findByIdAdmin(id: string): Promise<AdminReview | null> {
    return prisma.review.findUnique({
      where: { id },
      select: {
        id: true,
        productId: true,
        userId: true,
        rating: true,
        content: true,
        status: true,
        verifiedPurchase: true,
        createdAt: true,
        product: { select: { name: true, slug: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(status?: ReviewStatus): Promise<AdminReview[]> {
    return prisma.review.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        productId: true,
        userId: true,
        rating: true,
        content: true,
        status: true,
        verifiedPurchase: true,
        createdAt: true,
        product: { select: { name: true, slug: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
  }

  async moderateReview(id: string, status: ReviewStatus): Promise<AdminReview> {
    const updated = await prisma.review.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        productId: true,
        userId: true,
        rating: true,
        content: true,
        status: true,
        verifiedPurchase: true,
        createdAt: true,
        product: { select: { name: true, slug: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    await this.refreshProductReviewStats(updated.productId);

    return updated;
  }
}

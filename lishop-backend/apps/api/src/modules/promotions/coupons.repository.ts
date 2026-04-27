import { Injectable } from '@nestjs/common';
import { prisma, Coupon, Prisma } from '@lishop/database';

@Injectable()
export class CouponsRepository {
  findByCode(code: string): Promise<Coupon | null> {
    return prisma.coupon.findUnique({ where: { code } });
  }

  findById(id: string): Promise<Coupon | null> {
    return prisma.coupon.findUnique({ where: { id } });
  }

  async hasUsed(couponId: string, userId: string): Promise<boolean> {
    const usage = await prisma.couponUsage.findUnique({
      where: { couponId_userId: { couponId, userId } },
    });
    return usage !== null;
  }

  async recordUsage(couponId: string, userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.couponUsage.create({ data: { couponId, userId } }),
      prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } }),
    ]);
  }

  create(data: Prisma.CouponCreateInput): Promise<Coupon> {
    return prisma.coupon.create({ data });
  }

  findAll(): Promise<Coupon[]> {
    return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findPublic(): Promise<Coupon[]> {
    return prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}

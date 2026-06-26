import { Injectable, ConflictException } from '@nestjs/common';
import { prisma, OrderStatus, CouponType, Prisma } from '@lishop/database';

export interface AdminStats {
  orderCount: number;
  revenueVnd: number;
  userCount: number;
  productCount: number;
}

export interface AdminOrderItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalVnd: number;
  createdAt: Date;
  itemCount: number;
  user: { email: string; firstName: string; lastName: string };
}

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  loyaltyPoints: number;
  createdAt: Date;
}

export interface AdminCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderVnd: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface DailyRevenue {
  date: string; // 'YYYY-MM-DD'
  amount: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  revenue: number;
}

export interface AnalyticsSummary {
  revenueVnd: number;
  orderCount: number;
  averageOrderValueVnd: number;
  newUsers: number;
}

export interface OrderStatusMetric {
  status: OrderStatus;
  count: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  slug: string;
  stock: number;
}

export interface AdminAnalytics {
  summary: AnalyticsSummary;
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
  orderStatusBreakdown: OrderStatusMetric[];
  lowStockProducts: LowStockProduct[];
}

@Injectable()
export class AdminRepository {
  async getStats(): Promise<AdminStats> {
    const [orderCount, revenueResult, userCount, productCount] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: { in: [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] } },
        _sum: { totalVnd: true },
      }),
      prisma.user.count(),
      prisma.product.count(),
    ]);
    return {
      orderCount,
      revenueVnd: revenueResult._sum.totalVnd ?? 0,
      userCount,
      productCount,
    };
  }

  async findAllOrders(page = 1, limit = 50, shopId?: string): Promise<{ orders: AdminOrderItem[]; total: number }> {
    const where: { id?: { in: string[] } } = {};

    if (shopId) {
      const orderIds = await prisma.orderItem.findMany({
        where: { shopId },
        select: { orderId: true },
        distinct: ['orderId'],
      });
      where.id = { in: orderIds.map((o) => o.orderId) };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where: Object.keys(where).length > 0 ? where : undefined }),
    ]);
    return {
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalVnd: o.totalVnd,
        createdAt: o.createdAt,
        itemCount: o._count.items,
        user: o.user,
      })),
      total,
    };
  }

  findOrderById(id: string): Promise<{ id: string; status: OrderStatus; userId: string; orderNumber: string } | null> {
    return prisma.order.findUnique({ where: { id }, select: { id: true, status: true, userId: true, orderNumber: true } });
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<AdminOrderItem> {
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    });
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalVnd: order.totalVnd,
      createdAt: order.createdAt,
      itemCount: order._count.items,
      user: order.user,
    };
  }

  findAllUsers(): Promise<AdminUserItem[]> {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    }) as Promise<AdminUserItem[]>;
  }

  listCoupons(): Promise<AdminCoupon[]> {
    return prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, code: true, type: true, value: true,
        minOrderVnd: true, maxUses: true, usedCount: true,
        expiresAt: true, isActive: true, createdAt: true,
      },
    }) as Promise<AdminCoupon[]>;
  }

  async createCoupon(data: {
    code: string;
    type: string;
    value: number;
    minOrderVnd?: number;
    maxUses?: number;
    expiresAt?: string;
  }): Promise<AdminCoupon> {
    try {
      return await prisma.coupon.create({
        data: {
          code: data.code,
          type: data.type as CouponType,
          value: data.value,
          minOrderVnd: data.minOrderVnd ?? 0,
          maxUses: data.maxUses ?? null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        },
        select: {
          id: true, code: true, type: true, value: true,
          minOrderVnd: true, maxUses: true, usedCount: true,
          expiresAt: true, isActive: true, createdAt: true,
        },
      }) as AdminCoupon;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Mã giảm giá đã tồn tại');
      }
      throw err;
    }
  }

  async toggleCoupon(id: string): Promise<AdminCoupon | null> {
    const coupon = await prisma.coupon.findUnique({ where: { id }, select: { isActive: true } });
    if (!coupon) return null;
    return prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
      select: {
        id: true, code: true, type: true, value: true,
        minOrderVnd: true, maxUses: true, usedCount: true,
        expiresAt: true, isActive: true, createdAt: true,
      },
    }) as Promise<AdminCoupon>;
  }

  async getAnalytics(): Promise<AdminAnalytics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [orders, orderItems, newUsers, statusGroups, lowStockProducts] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
        },
        select: { createdAt: true, totalVnd: true },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: thirtyDaysAgo },
            status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
          },
        },
        select: { productId: true, productName: true, totalPriceVnd: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.product.findMany({
        where: { stock: { lte: 10 } },
        orderBy: { stock: 'asc' },
        take: 10,
        select: { id: true, name: true, slug: true, stock: true },
      }),
    ]);

    // Aggregate daily revenue
    const revenueMap = new Map<string, number>();
    for (const order of orders) {
      const date = order.createdAt.toISOString().slice(0, 10);
      revenueMap.set(date, (revenueMap.get(date) ?? 0) + order.totalVnd);
    }
    const dailyRevenue = Array.from(revenueMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate top products
    const productMap = new Map<string, { productName: string; revenue: number }>();
    for (const item of orderItems) {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.revenue += item.totalPriceVnd;
      } else {
        productMap.set(item.productId, { productName: item.productName, revenue: item.totalPriceVnd });
      }
    }
    const topProducts = Array.from(productMap.entries())
      .map(([productId, { productName, revenue }]) => ({ productId, productName, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const revenueVnd = orders.reduce((sum, order) => sum + order.totalVnd, 0);
    const summary = {
      revenueVnd,
      orderCount: orders.length,
      averageOrderValueVnd: orders.length > 0 ? Math.round(revenueVnd / orders.length) : 0,
      newUsers,
    };
    const statusCounts = new Map(statusGroups.map((row) => [row.status, row._count._all]));
    const orderStatusBreakdown = Object.values(OrderStatus).map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    }));

    return { summary, dailyRevenue, topProducts, orderStatusBreakdown, lowStockProducts };
  }
}

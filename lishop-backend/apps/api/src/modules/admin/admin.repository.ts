import { Injectable } from '@nestjs/common';
import { prisma, OrderStatus } from '@lishop/database';

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
  user: { email: string; firstName: string | null; lastName: string | null };
}

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  loyaltyPoints: number;
  createdAt: Date;
}

@Injectable()
export class AdminRepository {
  async getStats(): Promise<AdminStats> {
    const [orderCount, revenueResult, userCount, productCount] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalVnd: true } }),
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

  async findAllOrders(limit = 50): Promise<AdminOrderItem[]> {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    });
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalVnd: o.totalVnd,
      createdAt: o.createdAt,
      itemCount: o._count.items,
      user: o.user,
    }));
  }

  findOrderById(id: string): Promise<{ id: string; status: OrderStatus } | null> {
    return prisma.order.findUnique({ where: { id }, select: { id: true, status: true } });
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
}

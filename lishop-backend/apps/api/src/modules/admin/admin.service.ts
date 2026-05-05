import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminRepository, AdminStats, AdminOrderItem, AdminUserItem, AdminCoupon, AdminAnalytics } from './admin.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { InvoicesService } from '../invoices/invoices.service';
import { AddTrackingEventDto } from '../orders/dto/add-tracking-event.dto';
import { OrderStatus, prisma } from '@lishop/database';
import { UserRole } from '@lishop/contracts';

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly notifRepo: NotificationsRepository,
    private readonly invoicesService: InvoicesService,
  ) {}

  getStats(): Promise<AdminStats> {
    return this.repo.getStats();
  }

  listOrders(): Promise<AdminOrderItem[]> {
    return this.repo.findAllOrders();
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<AdminOrderItem> {
    const order = await this.repo.findOrderById(orderId);
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    if (status === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
      await this.awardLoyalty(orderId, order.userId, order.orderNumber);
      this.invoicesService.generateForOrder(orderId)
        .catch((err: unknown) => console.error('[AdminService] invoice generation failed', err));
    }

    const updated = await this.repo.updateOrderStatus(orderId, status);
    this.notifRepo
      .createNotification(
        order.userId,
        'Trạng thái đơn hàng đã thay đổi',
        `Đơn hàng #${order.orderNumber} đã chuyển sang trạng thái: ${status}.`,
        'ORDER_STATUS',
        orderId,
      )
      .catch((err: unknown) => console.error('[AdminService] notification failed', err));
    return updated;
  }

  private async awardLoyalty(orderId: string, userId: string, orderNumber: string): Promise<void> {
    const full = await prisma.order.findUnique({ where: { id: orderId }, select: { totalVnd: true } });
    if (!full) return;
    const points = Math.floor(full.totalVnd / 1000);
    if (points <= 0) return;

    // Idempotency guard: skip if loyalty was already awarded for this order
    const alreadyAwarded = await prisma.loyaltyPoint.findFirst({
      where: { userId, description: `Tích điểm đơn hàng #${orderNumber}` },
    });
    if (alreadyAwarded) return;

    await prisma.$transaction([
      prisma.loyaltyPoint.create({
        data: { userId, points, description: `Tích điểm đơn hàng #${orderNumber}` },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: points } },
      }),
    ]);
    this.notifRepo
      .createNotification(
        userId,
        'Bạn nhận được điểm tích lũy!',
        `Bạn nhận được ${points} điểm từ đơn hàng #${orderNumber}.`,
        'ORDER_STATUS',
        orderId,
      )
      .catch((err: unknown) => console.error('[AdminService] loyalty notification failed', err));
  }

  async addTrackingEvent(orderId: string, dto: AddTrackingEventDto): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        orderNumber: true,
        shipment: { select: { id: true } },
      },
    });
    if (!order || !order.shipment) throw new NotFoundException('Đơn hàng hoặc lô hàng không tồn tại');

    const shipmentId = order.shipment.id;

    await prisma.shipmentEvent.create({
      data: {
        shipmentId,
        status: dto.status,
        location: dto.location ?? null,
        description: dto.description,
      },
    });

    if (dto.status === 'DELIVERED') {
      await prisma.shipment.update({ where: { id: shipmentId }, data: { deliveredAt: new Date() } });
      const prev = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
      await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.DELIVERED } });
      if (prev?.status !== OrderStatus.DELIVERED) {
        await this.awardLoyalty(orderId, order.userId, order.orderNumber);
      }
      this.notifRepo
        .createNotification(
          order.userId,
          'Đơn hàng đã được giao',
          `Đơn hàng #${order.orderNumber} đã được giao thành công.`,
          'ORDER_STATUS',
          orderId,
        )
        .catch((err: unknown) => console.error('[AdminService] notification failed', err));
    } else if (dto.status === 'PICKED_UP') {
      await prisma.shipment.update({ where: { id: shipmentId }, data: { shippedAt: new Date() } });
      await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.SHIPPED } });
      this.notifRepo
        .createNotification(
          order.userId,
          'Đơn hàng đang được vận chuyển',
          `Đơn hàng #${order.orderNumber} đang trên đường giao đến bạn.`,
          'ORDER_STATUS',
          orderId,
        )
        .catch((err: unknown) => console.error('[AdminService] notification failed', err));
    }
  }

  listUsers(): Promise<AdminUserItem[]> {
    return this.repo.findAllUsers();
  }

  listCoupons(): Promise<AdminCoupon[]> {
    return this.repo.listCoupons();
  }

  createCoupon(data: { code: string; type: string; value: number; minOrderVnd?: number; maxUses?: number; expiresAt?: string }): Promise<AdminCoupon> {
    return this.repo.createCoupon(data);
  }

  async toggleCoupon(id: string): Promise<AdminCoupon> {
    const coupon = await this.repo.toggleCoupon(id);
    if (!coupon) throw new NotFoundException('Mã giảm giá không tồn tại');
    return coupon;
  }

  getAnalytics(): Promise<AdminAnalytics> {
    return this.repo.getAnalytics();
  }

  async updateUserRole(userId: string, role: UserRole): Promise<AdminUserItem> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    }) as Promise<AdminUserItem>;
  }
}

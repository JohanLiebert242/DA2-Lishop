import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminRepository, AdminStats, AdminOrderItem, AdminUserItem, AdminCoupon, AdminAnalytics } from './admin.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { AddTrackingEventDto } from '../orders/dto/add-tracking-event.dto';
import { OrderStatus, prisma } from '@lishop/database';

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly notifRepo: NotificationsRepository,
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
      await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.DELIVERED } });
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
}

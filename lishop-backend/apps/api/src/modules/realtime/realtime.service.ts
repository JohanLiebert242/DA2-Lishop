import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  relatedId: string | null;
  isRead: boolean;
  createdAt: Date;
}

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  // ─── Notification (backward compatible with existing NotificationsRepository) ───

  sendNotification(userId: string, notification: NotificationItem): void {
    this.gateway.sendToUser(userId, 'notification', notification);
  }

  // ─── Order ───

  emitOrderStatusUpdate(
    orderId: string,
    userId: string,
    data: {
      orderId: string;
      orderNumber: string;
      status: string;
      previousStatus?: string;
      timestamp: string;
    },
  ): void {
    this.gateway.sendToRoom(`order:${orderId}`, 'order:status', data);
    this.gateway.sendToUser(userId, 'order:status', data);
  }

  // ─── Ticket Chat ───

  emitTicketMessage(
    ticketId: string,
    message: {
      id: string;
      ticketId: string;
      userId: string;
      isAdmin: boolean;
      content: string;
      createdAt: Date;
    },
  ): void {
    this.gateway.sendToRoom(`ticket:${ticketId}`, 'ticket:message', {
      ticketId,
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
      },
    });
  }

  emitTicketStatusChange(ticketId: string, userId: string, status: string): void {
    const payload = { ticketId, status, timestamp: new Date().toISOString() };
    this.gateway.sendToRoom(`ticket:${ticketId}`, 'ticket:status', payload);
    this.gateway.sendToUser(userId, 'ticket:status', payload);
  }

  // ─── Shop Chat (customer ↔ seller) ───

  emitShopChatMessage(
    shopId: string,
    message: {
      id: string;
      shopId: string;
      userId: string;
      content: string;
      isFromShop: boolean;
      createdAt: Date;
    },
  ): void {
    this.gateway.sendToRoom(`shop:${shopId}`, 'shop:chat', {
      shopId,
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
      },
    });
  }

  // ─── Flash Sale ───

  emitFlashSaleUpdate(
    saleId: string,
    data: {
      saleId: string;
      isActive: boolean;
      items: Array<{ id: string; productId: string; discountPercent: number }>;
      startAt: string;
      endAt: string;
    },
  ): void {
    this.gateway.sendToRoom(`flashsale:${saleId}`, 'flashsale:update', data);
  }

  // ─── Inventory ───

  emitStockUpdate(
    productId: string,
    data: {
      productId: string;
      stock: number;
      previousStock: number;
      delta: number;
      timestamp: string;
    },
  ): void {
    this.gateway.sendToRoom(`product:${productId}:stock`, 'inventory:update', data);
  }

  // ─── Wallet / Top-up ───

  emitWalletTopupStatus(
    userId: string,
    data: {
      requestId: string;
      status: 'APPROVED' | 'REJECTED';
      amountVnd: number;
      adminNote?: string;
      timestamp: string;
    },
  ): void {
    this.gateway.sendToUser(userId, 'wallet:topup-status', data);
  }

  // ─── Admin Dashboard Feed ───

  emitAdminFeed(
    data:
      | { type: 'new_order'; orderId: string; orderNumber: string; totalVnd: number; customerName?: string; timestamp: string }
      | { type: 'new_ticket'; ticketId: string; subject: string; customerName?: string; timestamp: string }
      | { type: 'return_request'; returnId: string; orderNumber: string; customerName?: string; timestamp: string }
      | { type: 'wallet_topup'; topupId: string; userId: string; amountVnd: number; customerName?: string; timestamp: string },
  ): void {
    this.gateway.sendToAdmins('admin:feed', data);
  }
}

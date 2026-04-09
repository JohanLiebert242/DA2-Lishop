import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminRepository, AdminStats, AdminOrderItem, AdminUserItem } from './admin.repository';
import { OrderStatus } from '@lishop/database';

@Injectable()
export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  getStats(): Promise<AdminStats> {
    return this.repo.getStats();
  }

  listOrders(): Promise<AdminOrderItem[]> {
    return this.repo.findAllOrders();
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<AdminOrderItem> {
    const order = await this.repo.findOrderById(orderId);
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    return this.repo.updateOrderStatus(orderId, status);
  }

  listUsers(): Promise<AdminUserItem[]> {
    return this.repo.findAllUsers();
  }
}

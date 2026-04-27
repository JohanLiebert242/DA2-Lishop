import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@lishop/database';
import { InvoicesRepository, InvoiceData } from './invoices.repository';

@Injectable()
export class InvoicesService {
  constructor(private readonly repo: InvoicesRepository) {}

  async getInvoiceForOrder(userId: string, orderId: string): Promise<InvoiceData> {
    const invoice = await this.repo.findByOrderId(orderId, userId);
    if (!invoice) throw new NotFoundException('Hóa đơn không tồn tại');
    return invoice;
  }

  getUserInvoices(userId: string): Promise<InvoiceData[]> {
    return this.repo.findByUserId(userId);
  }

  getAllInvoices(): Promise<InvoiceData[]> {
    return this.repo.findAll();
  }

  async generateForOrder(orderId: string): Promise<InvoiceData> {
    // Idempotent — return existing invoice if already generated
    const existing = await this.repo.findByOrderId(orderId);
    if (existing) return existing;

    // Fetch order with user, address and items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        address: {
          select: {
            fullName: true,
            phone: true,
            street: true,
            district: true,
            city: true,
            country: true,
          },
        },
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPriceVnd: true,
            totalPriceVnd: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const subtotalVnd = order.items.reduce((sum, item) => sum + item.totalPriceVnd, 0);
    const vatPercent = 10;
    const vatVnd = Math.floor(subtotalVnd * (vatPercent / 100));
    const totalVnd = subtotalVnd + order.shippingFeeVnd - order.discountVnd + vatVnd;

    const billingAddress = [
      order.address.street,
      order.address.district,
      order.address.city,
      order.address.country,
    ].join(', ');

    return this.repo.create({
      orderId: order.id,
      userId: order.userId,
      billingName: order.address.fullName,
      billingEmail: order.user.email,
      billingAddress,
      billingPhone: order.address.phone,
      subtotalVnd,
      discountVnd: order.discountVnd,
      shippingFeeVnd: order.shippingFeeVnd,
      vatPercent,
      vatVnd,
      totalVnd,
    });
  }
}

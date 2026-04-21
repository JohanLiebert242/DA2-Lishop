import { Injectable } from '@nestjs/common';
import {
  prisma,
  ReturnReason,
  ReturnStatus,
  StockMovementType,
  OrderStatus,
  PaymentStatus,
} from '@lishop/database';
import { ReturnItemDto } from './dto/create-return.dto';

export interface ReturnRequestDetail {
  id: string;
  orderId: string;
  userId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  description: string | null;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  order: { orderNumber: string; totalVnd: number };
  user: { email: string; firstName: string; lastName: string };
  items: {
    id: string;
    orderItemId: string;
    quantity: number;
  }[];
}

@Injectable()
export class ReturnsRepository {
  async create(
    userId: string,
    orderId: string,
    reason: ReturnReason,
    description: string | undefined,
    items: ReturnItemDto[],
  ): Promise<ReturnRequestDetail> {
    return prisma.$transaction(async (tx) => {
      const returnRequest = await tx.returnRequest.create({
        data: {
          userId,
          orderId,
          reason,
          description: description ?? null,
          status: ReturnStatus.PENDING,
          items: {
            create: items.map((item) => ({
              orderItemId: item.orderItemId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          order: { select: { orderNumber: true, totalVnd: true } },
          user: { select: { email: true, firstName: true, lastName: true } },
          items: true,
        },
      });

      return returnRequest as ReturnRequestDetail;
    });
  }

  async findByUserId(userId: string): Promise<ReturnRequestDetail[]> {
    const results = await prisma.returnRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { orderNumber: true, totalVnd: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
        items: true,
      },
    });
    return results as ReturnRequestDetail[];
  }

  async findById(id: string): Promise<ReturnRequestDetail | null> {
    const result = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true, totalVnd: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
        items: true,
      },
    });
    return result as ReturnRequestDetail | null;
  }

  async findAll(limit = 50): Promise<ReturnRequestDetail[]> {
    const results = await prisma.returnRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        order: { select: { orderNumber: true, totalVnd: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
        items: true,
      },
    });
    return results as ReturnRequestDetail[];
  }

  async updateStatus(
    id: string,
    status: ReturnStatus,
    adminNote?: string,
  ): Promise<ReturnRequestDetail> {
    if (status === ReturnStatus.COMPLETED) {
      return prisma.$transaction(async (tx) => {
        // Get return request with items
        const returnRequest = await tx.returnRequest.findUniqueOrThrow({
          where: { id },
          include: { items: true },
        });

        // For each return item: find orderItem to get productId, restore stock, create StockMovement
        for (const item of returnRequest.items) {
          const orderItem = await tx.orderItem.findUnique({
            where: { id: item.orderItemId },
            select: { productId: true },
          });

          if (orderItem) {
            const updatedProduct = await tx.product.update({
              where: { id: orderItem.productId },
              data: { stock: { increment: item.quantity } },
              select: { id: true, stock: true },
            });

            await tx.stockMovement.create({
              data: {
                productId: orderItem.productId,
                type: StockMovementType.RETURN_COMPLETED,
                delta: item.quantity,
                balanceAfter: updatedProduct.stock,
                referenceId: id,
                note: `Hoàn trả đơn hàng — return request #${id}`,
              },
            });
          }
        }

        // Update order status to REFUNDED
        await tx.order.update({
          where: { id: returnRequest.orderId },
          data: { status: OrderStatus.REFUNDED },
        });

        // Update payment status to REFUNDED
        await tx.payment.updateMany({
          where: { orderId: returnRequest.orderId },
          data: { status: PaymentStatus.REFUNDED },
        });

        // Update return request status
        const updated = await tx.returnRequest.update({
          where: { id },
          data: {
            status: ReturnStatus.COMPLETED,
            adminNote: adminNote ?? null,
          },
          include: {
            order: { select: { orderNumber: true, totalVnd: true } },
            user: { select: { email: true, firstName: true, lastName: true } },
            items: true,
          },
        });

        return updated as ReturnRequestDetail;
      });
    }

    // Non-COMPLETED status: just update the fields
    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote ?? null,
      },
      include: {
        order: { select: { orderNumber: true, totalVnd: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
        items: true,
      },
    });

    return updated as ReturnRequestDetail;
  }
}

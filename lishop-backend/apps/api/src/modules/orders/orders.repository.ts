import { Injectable } from '@nestjs/common';
import {
  prisma,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingProvider,
  StockMovementType,
} from '@lishop/database';

export interface ShipmentWithEvents {
  id: string;
  provider: string;
  trackingNumber: string | null;
  estimatedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  events: { id: string; status: string; location: string | null; description: string; createdAt: Date }[];
}

export interface OrderItemInput {
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  variantSku?: string | null;
  variantAttributes?: unknown;
  quantity: number;
  unitPriceVnd: number;
  totalPriceVnd: number;
}

export interface CreateOrderInput {
  userId: string;
  addressId: string;
  shippingProvider: ShippingProvider;
  subtotalVnd: number;
  shippingFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  notes?: string;
  paymentMethod: PaymentMethod;
  items: OrderItemInput[];
}

export interface OrderWithDetails {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  shippingProvider: ShippingProvider;
  subtotalVnd: number;
  shippingFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  notes: string | null;
  trackingNumber: string | null;
  createdAt: Date;
  items: {
    id: string;
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    variantSku: string | null;
    variantAttributes: unknown;
    quantity: number;
    unitPriceVnd: number;
    totalPriceVnd: number;
  }[];
  address: {
    fullName: string;
    phone: string;
    street: string;
    district: string;
    city: string;
    country: string;
  };
  payment: {
    id: string;
    method: string;
    amountVnd: number;
    status: string;
  } | null;
}

const ORDER_INCLUDE = {
  items: true,
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
  payment: {
    select: { id: true, method: true, amountVnd: true, status: true },
  },
};

const ESTIMATED_DAYS: Record<ShippingProvider, number> = {
  GHN: 2,
  GHTK: 3,
  VIETTEL_POST: 4,
};

@Injectable()
export class OrdersRepository {
  async create(input: CreateOrderInput): Promise<OrderWithDetails> {
    const orderNumber = `LS-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const estimatedAt = new Date();
    estimatedAt.setDate(estimatedAt.getDate() + ESTIMATED_DAYS[input.shippingProvider]);

    return prisma.$transaction(async (tx) => {
      // Decrement stock atomically; throws P2025 if any item has insufficient stock
      const stockUpdates = await Promise.all(
        input.items.map(async (item) => {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
              select: { id: true, stock: true },
            });
          }

          return tx.product.update({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
            select: { id: true, stock: true },
          });
        }),
      );

      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: input.userId,
          addressId: input.addressId,
          status: OrderStatus.PENDING,
          shippingProvider: input.shippingProvider,
          subtotalVnd: input.subtotalVnd,
          shippingFeeVnd: input.shippingFeeVnd,
          discountVnd: input.discountVnd,
          totalVnd: input.totalVnd,
          notes: input.notes ?? null,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId ?? null,
              productName: item.productName,
              variantName: item.variantName ?? null,
              variantSku: item.variantSku ?? null,
              variantAttributes: item.variantAttributes ?? undefined,
              quantity: item.quantity,
              unitPriceVnd: item.unitPriceVnd,
              totalPriceVnd: item.totalPriceVnd,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });

      // Log stock movements
      await tx.stockMovement.createMany({
        data: input.items.map((item) => {
          const updated = stockUpdates.find((s) => s.id === item.productId)!;
          return {
            productId: item.productId,
            type: StockMovementType.ORDER_PLACED,
            delta: -item.quantity,
            balanceAfter: updated.stock,
            referenceId: order.id,
            note: `Đơn hàng #${orderNumber}`,
          };
        }),
      });

      // Create payment
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: input.paymentMethod,
          amountVnd: input.totalVnd,
          status: PaymentStatus.PENDING,
        },
      });

      // Create shipment + initial event
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          provider: input.shippingProvider,
          estimatedAt,
        },
      });
      await tx.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          status: 'CREATED',
          description: 'Đơn hàng đã được tạo và chờ xác nhận',
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: ORDER_INCLUDE,
      }) as Promise<OrderWithDetails>;
    });
  }

  findByUserId(userId: string): Promise<OrderWithDetails[]> {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
    }) as Promise<OrderWithDetails[]>;
  }

  async findShipmentByOrderId(orderId: string, userId: string): Promise<ShipmentWithEvents | null> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        shipment: {
          include: {
            events: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
    if (!order) return null;
    return order.shipment as ShipmentWithEvents | null;
  }

  findByIdAndUserId(id: string, userId: string): Promise<OrderWithDetails | null> {
    return prisma.order.findFirst({
      where: { id, userId },
      include: ORDER_INCLUDE,
    }) as Promise<OrderWithDetails | null>;
  }

  async cancelOrder(id: string): Promise<OrderWithDetails> {
    return prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({ where: { orderId: id } });

      // Restore stock
      const stockUpdates = await Promise.all(
        items.map(async (item) => {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
              select: { id: true, stock: true },
            });
          }

          return tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
            select: { id: true, stock: true },
          });
        }),
      );

      await tx.stockMovement.createMany({
        data: items.map((item) => {
          const updated = stockUpdates.find((s) => s.id === item.productId)!;
          return {
            productId: item.productId,
            type: StockMovementType.ORDER_CANCELLED,
            delta: item.quantity,
            balanceAfter: updated.stock,
            referenceId: id,
            note: 'Đơn hàng bị hủy — hoàn kho',
          };
        }),
      });

      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: ORDER_INCLUDE,
      }) as Promise<OrderWithDetails>;
    });
  }
}

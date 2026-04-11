import { Injectable } from '@nestjs/common';
import { prisma, OrderStatus, PaymentMethod, PaymentStatus } from '@lishop/database';

export interface OrderItemInput {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceVnd: number;
  totalPriceVnd: number;
}

export interface CreateOrderInput {
  userId: string;
  addressId: string;
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
    productName: string;
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

@Injectable()
export class OrdersRepository {
  async create(input: CreateOrderInput): Promise<OrderWithDetails> {
    const orderNumber = `LS-${Date.now()}`;
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: input.userId,
          addressId: input.addressId,
          status: OrderStatus.PENDING,
          subtotalVnd: input.subtotalVnd,
          shippingFeeVnd: input.shippingFeeVnd,
          discountVnd: input.discountVnd,
          totalVnd: input.totalVnd,
          notes: input.notes ?? null,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPriceVnd: item.unitPriceVnd,
              totalPriceVnd: item.totalPriceVnd,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: input.paymentMethod,
          amountVnd: input.totalVnd,
          status: PaymentStatus.PENDING,
        },
      });
      return prisma.order.findUniqueOrThrow({
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

  findByIdAndUserId(id: string, userId: string): Promise<OrderWithDetails | null> {
    return prisma.order.findFirst({
      where: { id, userId },
      include: ORDER_INCLUDE,
    }) as Promise<OrderWithDetails | null>;
  }

  cancelOrder(id: string): Promise<OrderWithDetails> {
    return prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: ORDER_INCLUDE,
    }) as Promise<OrderWithDetails>;
  }
}

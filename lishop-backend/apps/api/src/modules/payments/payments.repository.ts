import { Injectable } from '@nestjs/common';
import { prisma, PaymentStatus } from '@lishop/database';

export interface PaymentInfo {
  id: string;
  orderId: string;
  method: string;
  amountVnd: number;
  status: PaymentStatus;
  providerRef: string | null;
  invoiceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPaymentItem extends PaymentInfo {
  order: { orderNumber: string; userId: string; user: { email: string; firstName: string; lastName: string } };
}

@Injectable()
export class PaymentsRepository {
  async findByOrderId(orderId: string, userId: string): Promise<PaymentInfo | null> {
    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        order: { userId },
      },
      select: {
        id: true,
        orderId: true,
        method: true,
        amountVnd: true,
        status: true,
        providerRef: true,
        invoiceUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return payment;
  }

  findAll(): Promise<AdminPaymentItem[]> {
    return prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderId: true,
        method: true,
        amountVnd: true,
        status: true,
        providerRef: true,
        invoiceUrl: true,
        createdAt: true,
        updatedAt: true,
        order: {
          select: {
            orderNumber: true,
            userId: true,
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
    }) as Promise<AdminPaymentItem[]>;
  }

  confirmPayment(orderId: string): Promise<PaymentInfo> {
    return prisma.payment.update({
      where: { orderId },
      data: { status: PaymentStatus.COMPLETED },
      select: {
        id: true,
        orderId: true,
        method: true,
        amountVnd: true,
        status: true,
        providerRef: true,
        invoiceUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

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

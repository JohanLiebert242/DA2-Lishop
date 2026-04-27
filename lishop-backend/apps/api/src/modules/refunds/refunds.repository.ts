import { Injectable } from '@nestjs/common';
import { prisma, RefundStatus } from '@lishop/database';

export interface RefundData {
  id: string;
  orderId: string;
  returnId: string | null;
  userId: string;
  amountVnd: number;
  method: string;
  status: string;
  reason: string | null;
  adminNote: string | null;
  processedAt: Date | null;
  createdAt: Date;
  order: { orderNumber: string };
  user: { email: string; firstName: string; lastName: string };
}

const REFUND_INCLUDE = {
  order: { select: { orderNumber: true } },
  user: { select: { email: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class RefundsRepository {
  async findById(id: string): Promise<RefundData | null> {
    return prisma.refund.findUnique({
      where: { id },
      include: REFUND_INCLUDE,
    }) as Promise<RefundData | null>;
  }

  async findByUserId(userId: string): Promise<RefundData[]> {
    return prisma.refund.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: REFUND_INCLUDE,
    }) as Promise<RefundData[]>;
  }

  async findByOrderId(orderId: string): Promise<RefundData | null> {
    return prisma.refund.findFirst({
      where: { orderId },
      include: REFUND_INCLUDE,
    }) as Promise<RefundData | null>;
  }

  async findAll(): Promise<RefundData[]> {
    return prisma.refund.findMany({
      orderBy: { createdAt: 'desc' },
      include: REFUND_INCLUDE,
    }) as Promise<RefundData[]>;
  }

  async create(data: {
    orderId: string;
    returnId?: string;
    userId: string;
    amountVnd: number;
    method: string;
    reason?: string;
  }): Promise<RefundData> {
    return prisma.refund.create({
      data: {
        orderId: data.orderId,
        returnId: data.returnId ?? null,
        userId: data.userId,
        amountVnd: data.amountVnd,
        method: data.method as never,
        status: RefundStatus.PENDING,
        reason: data.reason ?? null,
      },
      include: REFUND_INCLUDE,
    }) as Promise<RefundData>;
  }

  async updateStatus(id: string, status: string, adminNote?: string): Promise<RefundData> {
    const isTerminal =
      status === RefundStatus.COMPLETED || status === RefundStatus.FAILED;

    return prisma.refund.update({
      where: { id },
      data: {
        status: status as never,
        adminNote: adminNote ?? null,
        ...(isTerminal && { processedAt: new Date() }),
      },
      include: REFUND_INCLUDE,
    }) as Promise<RefundData>;
  }
}

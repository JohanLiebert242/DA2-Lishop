import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, PaymentStatus, OrderStatus } from '@lishop/database';
import { PaymentsRepository, PaymentInfo, AdminPaymentItem } from './payments.repository';
import { PaymentsGatewayService } from './payments.gateway';
import { PaymentMethod } from '@lishop/database';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly gateway: PaymentsGatewayService,
  ) {}

  async getPayment(userId: string, orderId: string): Promise<PaymentInfo> {
    const payment = await this.repo.findByOrderId(orderId, userId);
    if (!payment) throw new NotFoundException(`Payment for order ${orderId} not found`);
    return payment;
  }

  async initiatePayment(
    userId: string,
    orderId: string,
    clientIp?: string,
  ): Promise<{ paymentUrl: string | null; status: string }> {
    const payment = await this.repo.findByOrderId(orderId, userId);
    if (!payment) throw new NotFoundException(`Payment for order ${orderId} not found`);

    if (payment.status === PaymentStatus.COMPLETED) {
      return { paymentUrl: null, status: 'COMPLETED' };
    }

    if (
      payment.method === PaymentMethod.COD ||
      payment.method === PaymentMethod.WALLET
    ) {
      return { paymentUrl: null, status: 'PENDING' };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    let paymentUrl: string;

    if (payment.method === PaymentMethod.VNPAY) {
      paymentUrl = this.gateway.generateVNPayUrl(
        orderId,
        payment.amountVnd,
        `Thanh toan don hang #${order.orderNumber}`,
        clientIp ?? '127.0.0.1',
      );
    } else if (payment.method === PaymentMethod.MOMO) {
      const r = await this.gateway.generateMoMoUrl(orderId, payment.amountVnd);
      paymentUrl = r.payUrl;
    } else if (payment.method === PaymentMethod.ZALOPAY) {
      const r = await this.gateway.generateZaloPayUrl(orderId, payment.amountVnd);
      paymentUrl = r.orderUrl;
    } else {
      paymentUrl = `https://payment.example.com/pay?ref=${orderId}`;
    }

    return { paymentUrl, status: 'PENDING' };
  }

  async handleVNPayReturn(
    query: Record<string, string>,
  ): Promise<{ success: boolean; orderId: string }> {
    const valid = this.gateway.verifyVNPayReturn(query);
    const success = valid && query['vnp_ResponseCode'] === '00';

    // vnp_TxnRef is UUID with hyphens removed (32 hex chars); restore hyphens to recover orderId
    const txnRef = query['vnp_TxnRef'] ?? '';
    const orderId = txnRef.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');

    if (success) {
      const payment = await prisma.payment.findFirst({
        where: { orderId },
        select: { orderId: true },
      });

      if (payment) {
        await prisma.$transaction([
          prisma.payment.update({
            where: { orderId: payment.orderId },
            data: { status: PaymentStatus.COMPLETED },
          }),
          prisma.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.PROCESSING },
          }),
        ]);
        return { success: true, orderId: payment.orderId };
      }
    }

    return { success, orderId };
  }

  async handleMockPayment(
    orderId: string,
    success: boolean,
    providerRef?: string,
  ): Promise<{ success: boolean; orderId: string }> {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      select: { orderId: true },
    });
    if (!payment) throw new NotFoundException(`Payment for order ${orderId} not found`);

    if (success) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { orderId },
          data: {
            status: PaymentStatus.COMPLETED,
            providerRef: providerRef ?? `mock_${Date.now()}`,
          },
        }),
        prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PROCESSING },
        }),
      ]);
    } else {
      await prisma.payment.update({
        where: { orderId },
        data: {
          status: PaymentStatus.FAILED,
          providerRef: providerRef ?? `mock_failed_${Date.now()}`,
        },
      });
    }

    return { success, orderId };
  }

  async handleMoMoIpn(body: Record<string, string | number>): Promise<void> {
    const valid = this.gateway.verifyMoMoIpn(body);
    if (!valid) return;

    if (Number(body['resultCode']) === 0) {
      // orderId in MoMo body is the requestId we set: `${originalOrderId}-${timestamp}`
      const momoOrderId = String(body['orderId'] ?? '');
      const originalOrderId = momoOrderId.replace(/-\d+$/, '');

      if (originalOrderId) {
        await prisma.$transaction([
          prisma.payment.update({
            where: { orderId: originalOrderId },
            data: { status: PaymentStatus.COMPLETED },
          }),
          prisma.order.update({
            where: { id: originalOrderId },
            data: { status: OrderStatus.PROCESSING },
          }),
        ]);
      }
    }
  }

  async handleZaloPayCallback(body: {
    data: string;
    mac: string;
  }): Promise<void> {
    const valid = this.gateway.verifyZaloPayCallback(body.data, body.mac);
    if (!valid) return;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body.data) as Record<string, unknown>;
    } catch {
      return;
    }

    // app_user is the orderId we passed to ZaloPay
    const orderId = String(parsed['app_user'] ?? '');
    if (orderId) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { orderId },
          data: { status: PaymentStatus.COMPLETED },
        }),
        prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PROCESSING },
        }),
      ]);
    }
  }

  getAllPayments(): Promise<AdminPaymentItem[]> {
    return this.repo.findAll();
  }

  confirmPaymentAdmin(orderId: string): Promise<PaymentInfo> {
    return this.repo.confirmPayment(orderId).then(async (payment) => {
      if (payment.method === PaymentMethod.COD) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PROCESSING },
        });
      }
      return payment;
    });
  }
}

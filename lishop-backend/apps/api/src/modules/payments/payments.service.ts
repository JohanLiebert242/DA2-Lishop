import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentsRepository, PaymentInfo, AdminPaymentItem } from './payments.repository';
import { PaymentMethod } from '@lishop/database';

@Injectable()
export class PaymentsService {
  constructor(private readonly repo: PaymentsRepository) {}

  async getPayment(userId: string, orderId: string): Promise<PaymentInfo> {
    const payment = await this.repo.findByOrderId(orderId, userId);
    if (!payment) throw new NotFoundException(`Payment for order ${orderId} not found`);
    return payment;
  }

  async initiatePayment(
    userId: string,
    orderId: string,
  ): Promise<{ paymentUrl: string | null; status: string }> {
    const payment = await this.repo.findByOrderId(orderId, userId);
    if (!payment) throw new NotFoundException(`Payment for order ${orderId} not found`);

    if (payment.method === PaymentMethod.COD) {
      return { paymentUrl: null, status: 'PENDING' };
    }

    // Mock payment URL — ready for real SDK swap-in
    return {
      paymentUrl: `https://payment.example.com/pay?ref=${orderId}`,
      status: 'PENDING',
    };
  }

  getAllPayments(): Promise<AdminPaymentItem[]> {
    return this.repo.findAll();
  }

  confirmPaymentAdmin(orderId: string): Promise<PaymentInfo> {
    return this.repo.confirmPayment(orderId);
  }
}

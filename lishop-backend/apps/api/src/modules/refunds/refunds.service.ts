import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RefundMethod, RefundStatus } from '@lishop/database';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { WalletService } from '../wallet/wallet.service';
import { RefundData, RefundsRepository } from './refunds.repository';

@Injectable()
export class RefundsService {
  constructor(
    private readonly repo: RefundsRepository,
    private readonly walletService: WalletService,
    private readonly notifRepo: NotificationsRepository,
  ) {}

  async getUserRefunds(userId: string): Promise<RefundData[]> {
    return this.repo.findByUserId(userId);
  }

  async getRefund(userId: string, id: string): Promise<RefundData> {
    const refund = await this.repo.findById(id);

    if (!refund) {
      throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền');
    }

    if (refund.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập yêu cầu hoàn tiền này');
    }

    return refund;
  }

  async getAllRefunds(): Promise<RefundData[]> {
    return this.repo.findAll();
  }

  async createRefund(
    orderId: string,
    userId: string,
    amountVnd: number,
    method: string,
    returnId?: string,
    reason?: string,
  ): Promise<RefundData> {
    if (returnId) {
      const existing = await this.repo.findByReturnId(returnId);
      if (existing) return existing;
    }
    return this.repo.create({ orderId, returnId, userId, amountVnd, method, reason });
  }

  async processRefund(id: string, adminNote?: string): Promise<RefundData> {
    const refund = await this.repo.findById(id);

    if (!refund) {
      throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền');
    }

    let updated: RefundData;

    if (refund.method === RefundMethod.WALLET) {
      // Credit the wallet then mark completed
      await this.walletService.refundToWallet(refund.userId, refund.orderId, refund.amountVnd);
      updated = await this.repo.updateStatus(id, RefundStatus.COMPLETED, adminNote);

      // Notify user (fire-and-forget)
      this.notifRepo
        .createNotification(
          refund.userId,
          'Hoàn tiền thành công',
          `Số tiền ${refund.amountVnd.toLocaleString('vi-VN')}đ đã được hoàn vào ví của bạn.`,
          'ORDER_STATUS',
          refund.orderId,
        )
        .catch((err: unknown) =>
          console.error('[RefundsService] wallet refund notification failed', err),
        );
    } else {
      // ORIGINAL_PAYMENT or MANUAL — move to PROCESSING and await external step
      updated = await this.repo.updateStatus(id, RefundStatus.PROCESSING, adminNote);

      // Notify user (fire-and-forget)
      this.notifRepo
        .createNotification(
          refund.userId,
          'Hoàn tiền đang được xử lý',
          'Yêu cầu hoàn tiền của bạn đang được xử lý. Vui lòng chờ trong 3–5 ngày làm việc.',
          'ORDER_STATUS',
          refund.orderId,
        )
        .catch((err: unknown) =>
          console.error('[RefundsService] refund processing notification failed', err),
        );
    }

    return updated;
  }
}

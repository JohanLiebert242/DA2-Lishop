import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma, WalletTxType } from '@lishop/database';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { RealtimeService } from '../realtime/realtime.service';
import { BankTransferInfo, WalletRepository, WalletInfo, WalletTopupRequestItem, WalletTxItem } from './wallet.repository';

const POINTS_TO_VND = 100; // 1 point = 100 VND
const TOPUP_BANK = {
  bankName: process.env['WALLET_TOPUP_BANK_NAME'] ?? 'Ngân hàng Demo Lishop',
  bankAccountNumber: process.env['WALLET_TOPUP_BANK_ACCOUNT_NUMBER'] ?? '1900 6868 6868',
  bankAccountName: process.env['WALLET_TOPUP_BANK_ACCOUNT_NAME'] ?? 'CONG TY TNHH LISHOP',
};

@Injectable()
export class WalletService {
  constructor(
    private readonly repo: WalletRepository,
    private readonly notifRepo: NotificationsRepository,
    private readonly realtime: RealtimeService,
  ) {}

  getWallet(userId: string): Promise<WalletInfo> {
    return this.repo.findOrCreate(userId);
  }

  getTransactions(userId: string): Promise<WalletTxItem[]> {
    return this.repo.getTransactions(userId);
  }

  async topUp(
    userId: string,
    amountVnd: number,
    transferCode?: string,
  ): Promise<{ request: WalletTopupRequestItem; bankTransfer: BankTransferInfo; paymentUrl: null }> {
    const finalTransferCode = transferCode ?? this.generateTransferCode();
    const request = await this.repo.createTopupRequest(userId, amountVnd, {
      ...TOPUP_BANK,
      transferCode: finalTransferCode,
    });
    void this.notifyAdmins(
      'Yeu cau nap vi moi',
      `Khach hang vua tao yeu cau nap ${amountVnd.toLocaleString('vi-VN')} VND.`,
      request.id,
    );

    this.realtime.emitAdminFeed({
      type: 'wallet_topup',
      topupId: request.id,
      userId,
      amountVnd,
      timestamp: new Date().toISOString(),
    });

    return {
      request,
      bankTransfer: {
        ...TOPUP_BANK,
        transferCode: finalTransferCode,
        amountVnd,
      },
      paymentUrl: null,
    };
  }

  getTopupRequests(userId: string): Promise<WalletTopupRequestItem[]> {
    return this.repo.findTopupRequestsByUser(userId);
  }

  deductForOrder(userId: string, orderId: string, amountVnd: number): Promise<WalletInfo> {
    return this.repo.debit(
      userId,
      amountVnd,
      WalletTxType.PAYMENT,
      `Thanh toán đơn hàng`,
      orderId,
    );
  }

  refundToWallet(userId: string, orderId: string, amountVnd: number): Promise<WalletInfo> {
    return this.repo.credit(
      userId,
      amountVnd,
      WalletTxType.REFUND,
      `Refund for order`,
      orderId,
    );
  }

  adminGetAll() {
    return this.repo.adminFindAll();
  }

  adminGetTopupRequests(): Promise<WalletTopupRequestItem[]> {
    return this.repo.adminFindTopupRequests();
  }

  async approveTopupRequest(id: string, adminId: string, adminNote?: string): Promise<WalletTopupRequestItem> {
    const request = await this.repo.approveTopupRequest(id, adminId, adminNote);
    void this.notifRepo.createNotification(
      request.userId,
      'Yeu cau nap vi da duoc chap nhan',
      `Yeu cau nap ${request.amountVnd.toLocaleString('vi-VN')} VND da duoc xac nhan.`,
      'WALLET_TOPUP',
      request.id,
    );
    return request;
  }

  async rejectTopupRequest(id: string, adminId: string, adminNote?: string): Promise<WalletTopupRequestItem> {
    const request = await this.repo.rejectTopupRequest(id, adminId, adminNote);
    void this.notifRepo.createNotification(
      request.userId,
      'Yeu cau nap vi bi tu choi',
      adminNote?.trim()
        ? `Yeu cau nap vi cua ban bi tu choi: ${adminNote.trim()}`
        : 'Yeu cau nap vi cua ban bi tu choi.',
      'WALLET_TOPUP',
      request.id,
    );
    return request;
  }

  async convertPoints(
    userId: string,
    points: number,
  ): Promise<{ wallet: WalletInfo; pointsConverted: number; amountCredited: number }> {
    const amountCredited = points * POINTS_TO_VND;

    const wallet = await prisma.$transaction(async (tx) => {
      // Fetch and validate current loyalty points
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { loyaltyPoints: true },
      });

      if (user.loyaltyPoints < points) {
        throw new BadRequestException(
          `Không đủ điểm tích lũy. Bạn hiện có ${user.loyaltyPoints} điểm, cần ${points} điểm`,
        );
      }

      // Deduct loyalty points from user
      await tx.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { decrement: points } },
      });

      // Upsert wallet and credit the converted amount
      const updatedWallet = await tx.wallet.upsert({
        where: { userId },
        update: { balanceVnd: { increment: amountCredited } },
        create: { userId, balanceVnd: amountCredited },
        select: {
          id: true,
          userId: true,
          balanceVnd: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Record the wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          type: WalletTxType.POINTS_CONVERSION,
          amountVnd: amountCredited,
          balanceAfter: updatedWallet.balanceVnd,
          description: `Converted ${points} loyalty points to ${amountCredited.toLocaleString()} VND`,
        },
      });

      return updatedWallet;
    });

    return { wallet, pointsConverted: points, amountCredited };
  }

  private generateTransferCode(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `LSW-${date}-${suffix}`;
  }

  private async notifyAdmins(title: string, body: string, relatedId: string): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifRepo.createNotification(admin.id, title, body, 'WALLET_TOPUP', relatedId),
      ),
    );
  }
}

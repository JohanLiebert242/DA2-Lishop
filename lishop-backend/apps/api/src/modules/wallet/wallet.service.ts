import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma, WalletTxType } from '@lishop/database';
import { BankTransferInfo, WalletRepository, WalletInfo, WalletTopupRequestItem, WalletTxItem } from './wallet.repository';

const POINTS_TO_VND = 100; // 1 point = 100 VND
const TOPUP_BANK = {
  bankName: process.env['WALLET_TOPUP_BANK_NAME'] ?? 'Ngân hàng Demo Lishop',
  bankAccountNumber: process.env['WALLET_TOPUP_BANK_ACCOUNT_NUMBER'] ?? '1900 6868 6868',
  bankAccountName: process.env['WALLET_TOPUP_BANK_ACCOUNT_NAME'] ?? 'CONG TY TNHH LISHOP',
};

@Injectable()
export class WalletService {
  constructor(private readonly repo: WalletRepository) {}

  getWallet(userId: string): Promise<WalletInfo> {
    return this.repo.findOrCreate(userId);
  }

  getTransactions(userId: string): Promise<WalletTxItem[]> {
    return this.repo.getTransactions(userId);
  }

  async topUp(
    userId: string,
    amountVnd: number,
  ): Promise<{ request: WalletTopupRequestItem; bankTransfer: BankTransferInfo; paymentUrl: null }> {
    const transferCode = this.generateTransferCode();
    const request = await this.repo.createTopupRequest(userId, amountVnd, {
      ...TOPUP_BANK,
      transferCode,
    });

    return {
      request,
      bankTransfer: {
        ...TOPUP_BANK,
        transferCode,
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

  approveTopupRequest(id: string, adminId: string, adminNote?: string): Promise<WalletTopupRequestItem> {
    return this.repo.approveTopupRequest(id, adminId, adminNote);
  }

  rejectTopupRequest(id: string, adminId: string, adminNote?: string): Promise<WalletTopupRequestItem> {
    return this.repo.rejectTopupRequest(id, adminId, adminNote);
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
}

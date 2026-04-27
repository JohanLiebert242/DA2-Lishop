import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma, WalletTxType } from '@lishop/database';
import { WalletRepository, WalletInfo, WalletTxItem } from './wallet.repository';

const POINTS_TO_VND = 100; // 1 point = 100 VND

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
  ): Promise<{ wallet: WalletInfo; paymentUrl: string | null }> {
    // Direct credit — real integration would create a pending topup and redirect to payment gateway
    const wallet = await this.repo.credit(
      userId,
      amountVnd,
      WalletTxType.TOPUP,
      `Top-up ${amountVnd.toLocaleString()} VND`,
    );
    return { wallet, paymentUrl: null };
  }

  deductForOrder(userId: string, orderId: string, amountVnd: number): Promise<WalletInfo> {
    return this.repo.debit(
      userId,
      amountVnd,
      WalletTxType.PAYMENT,
      `Payment for order`,
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
          `Insufficient loyalty points. You have ${user.loyaltyPoints} points, need ${points}`,
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
}

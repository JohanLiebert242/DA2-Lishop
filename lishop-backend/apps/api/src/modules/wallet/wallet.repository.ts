import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma, WalletTxType } from '@lishop/database';

export interface WalletInfo {
  id: string;
  userId: string;
  balanceVnd: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTxItem {
  id: string;
  type: string;
  amountVnd: number;
  balanceAfter: number;
  description: string | null;
  referenceId: string | null;
  createdAt: Date;
}

const WALLET_SELECT = {
  id: true,
  userId: true,
  balanceVnd: true,
  createdAt: true,
  updatedAt: true,
} as const;

const TX_SELECT = {
  id: true,
  type: true,
  amountVnd: true,
  balanceAfter: true,
  description: true,
  referenceId: true,
  createdAt: true,
} as const;

@Injectable()
export class WalletRepository {
  findByUserId(userId: string): Promise<WalletInfo | null> {
    return prisma.wallet.findFirst({
      where: { userId },
      select: WALLET_SELECT,
    });
  }

  async findOrCreate(userId: string): Promise<WalletInfo> {
    return prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balanceVnd: 0 },
      select: WALLET_SELECT,
    });
  }

  async getTransactions(userId: string, limit = 50): Promise<WalletTxItem[]> {
    const wallet = await prisma.wallet.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) return [];

    return prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: TX_SELECT,
    }) as Promise<WalletTxItem[]>;
  }

  async credit(
    userId: string,
    amountVnd: number,
    type: WalletTxType,
    description: string,
    referenceId?: string,
  ): Promise<WalletInfo> {
    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: { balanceVnd: { increment: amountVnd } },
        create: { userId, balanceVnd: amountVnd },
        select: WALLET_SELECT,
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amountVnd,
          balanceAfter: wallet.balanceVnd,
          description,
          referenceId: referenceId ?? null,
        },
      });

      return wallet;
    });
  }

  async debit(
    userId: string,
    amountVnd: number,
    type: WalletTxType,
    description: string,
    referenceId?: string,
  ): Promise<WalletInfo> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.wallet.findFirst({
        where: { userId },
        select: { id: true, balanceVnd: true },
      });
      if (!current || current.balanceVnd < amountVnd) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const wallet = await tx.wallet.update({
        where: { userId },
        data: { balanceVnd: { decrement: amountVnd } },
        select: WALLET_SELECT,
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amountVnd,
          balanceAfter: wallet.balanceVnd,
          description,
          referenceId: referenceId ?? null,
        },
      });

      return wallet;
    });
  }

  adminFindAll(): Promise<(WalletInfo & { user: { email: string; firstName: string; lastName: string } })[]> {
    return prisma.wallet.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        ...WALLET_SELECT,
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    }) as Promise<(WalletInfo & { user: { email: string; firstName: string; lastName: string } })[]>;
  }
}

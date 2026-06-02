import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma, WalletTopupStatus, WalletTxType } from '@lishop/database';

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

export interface BankTransferInfo {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  transferCode: string;
  amountVnd: number;
}

export interface WalletTopupRequestItem {
  id: string;
  userId: string;
  walletId: string;
  amountVnd: number;
  status: WalletTopupStatus;
  transferCode: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: { email: string; firstName: string; lastName: string };
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

const TOPUP_SELECT = {
  id: true,
  userId: true,
  walletId: true,
  amountVnd: true,
  status: true,
  transferCode: true,
  bankName: true,
  bankAccountNumber: true,
  bankAccountName: true,
  adminNote: true,
  reviewedById: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
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

  async createTopupRequest(
    userId: string,
    amountVnd: number,
    bank: Omit<BankTransferInfo, 'amountVnd'>,
  ): Promise<WalletTopupRequestItem> {
    const wallet = await this.findOrCreate(userId);

    return prisma.walletTopupRequest.create({
      data: {
        userId,
        walletId: wallet.id,
        amountVnd,
        status: WalletTopupStatus.PENDING,
        transferCode: bank.transferCode,
        bankName: bank.bankName,
        bankAccountNumber: bank.bankAccountNumber,
        bankAccountName: bank.bankAccountName,
      },
      select: TOPUP_SELECT,
    }) as Promise<WalletTopupRequestItem>;
  }

  findTopupRequestsByUser(userId: string): Promise<WalletTopupRequestItem[]> {
    return prisma.walletTopupRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: TOPUP_SELECT,
    }) as Promise<WalletTopupRequestItem[]>;
  }

  adminFindTopupRequests(): Promise<WalletTopupRequestItem[]> {
    return prisma.walletTopupRequest.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        ...TOPUP_SELECT,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    }) as Promise<WalletTopupRequestItem[]>;
  }

  async approveTopupRequest(id: string, adminId: string, adminNote?: string): Promise<WalletTopupRequestItem> {
    return prisma.$transaction(async (tx) => {
      const request = await tx.walletTopupRequest.findUniqueOrThrow({
        where: { id },
      });

      if (request.status !== WalletTopupStatus.PENDING) {
        throw new BadRequestException('Top-up request has already been reviewed');
      }

      const wallet = await tx.wallet.update({
        where: { id: request.walletId },
        data: { balanceVnd: { increment: request.amountVnd } },
        select: WALLET_SELECT,
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxType.TOPUP,
          amountVnd: request.amountVnd,
          balanceAfter: wallet.balanceVnd,
          description: `Bank transfer top-up ${request.transferCode}`,
          referenceId: request.id,
        },
      });

      return tx.walletTopupRequest.update({
        where: { id },
        data: {
          status: WalletTopupStatus.APPROVED,
          adminNote: adminNote ?? null,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
        select: TOPUP_SELECT,
      }) as Promise<WalletTopupRequestItem>;
    });
  }

  async rejectTopupRequest(id: string, adminId: string, adminNote?: string): Promise<WalletTopupRequestItem> {
    return prisma.$transaction(async (tx) => {
      const request = await tx.walletTopupRequest.findUniqueOrThrow({
        where: { id },
      });

      if (request.status !== WalletTopupStatus.PENDING) {
        throw new BadRequestException('Top-up request has already been reviewed');
      }

      return tx.walletTopupRequest.update({
        where: { id },
        data: {
          status: WalletTopupStatus.REJECTED,
          adminNote: adminNote ?? null,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
        select: TOPUP_SELECT,
      }) as Promise<WalletTopupRequestItem>;
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

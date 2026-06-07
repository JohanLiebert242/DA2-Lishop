import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { WalletTxType } from '@lishop/database';

jest.mock('@lishop/database', () => ({
  prisma: {
    $transaction: jest.fn(),
    user: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    wallet: { upsert: jest.fn() },
    walletTransaction: { create: jest.fn() },
  },
  WalletTxType: {
    TOPUP: 'TOPUP',
    PAYMENT: 'PAYMENT',
    REFUND: 'REFUND',
    POINTS_CONVERSION: 'POINTS_CONVERSION',
  },
}));

import { prisma } from '@lishop/database';

const mockWallet: any = {
  id: 'w1',
  userId: 'u1',
  balanceVnd: 100000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WalletService', () => {
  let service: WalletService;
  const repo = {
    findOrCreate: jest.fn(),
    getTransactions: jest.fn(),
    credit: jest.fn(),
    debit: jest.fn(),
    adminFindAll: jest.fn(),
    createTopupRequest: jest.fn(),
    findTopupRequestsByUser: jest.fn(),
    adminFindTopupRequests: jest.fn(),
    approveTopupRequest: jest.fn(),
    rejectTopupRequest: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WalletService, { provide: WalletRepository, useValue: repo }],
    }).compile();
    service = module.get(WalletService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getWallet delegates to repo.findOrCreate', async () => {
    repo.findOrCreate.mockResolvedValue(mockWallet);
    const result = await service.getWallet('u1');
    expect(repo.findOrCreate).toHaveBeenCalledWith('u1');
    expect(result).toBe(mockWallet);
  });

  it('getTransactions delegates to repo', async () => {
    repo.getTransactions.mockResolvedValue([]);
    await service.getTransactions('u1');
    expect(repo.getTransactions).toHaveBeenCalledWith('u1');
  });

  it('topUp creates a pending bank transfer request without crediting wallet', async () => {
    const topupRequest = {
      id: 'topup1',
      amountVnd: 50000,
      transferCode: 'LSW-20260602-ABC123',
      status: 'PENDING',
    };
    repo.createTopupRequest.mockResolvedValue(topupRequest);

    const result = await service.topUp('u1', 50000);

    expect(repo.credit).not.toHaveBeenCalled();
    expect(repo.createTopupRequest).toHaveBeenCalledWith('u1', 50000, expect.objectContaining({
      bankName: expect.any(String),
      bankAccountNumber: expect.any(String),
      bankAccountName: expect.any(String),
      transferCode: expect.stringMatching(/^LSW-\d{8}-[A-Z0-9]{6}$/),
    }));
    expect(result.request).toBe(topupRequest);
    expect(result.bankTransfer.amountVnd).toBe(50000);
    expect(result.paymentUrl).toBeNull();
  });

  it('getTopupRequests delegates to repo', async () => {
    repo.findTopupRequestsByUser.mockResolvedValue([]);
    await service.getTopupRequests('u1');
    expect(repo.findTopupRequestsByUser).toHaveBeenCalledWith('u1');
  });

  it('deductForOrder debits wallet with PAYMENT type', async () => {
    repo.debit.mockResolvedValue(mockWallet);
    await service.deductForOrder('u1', 'order1', 30000);
    expect(repo.debit).toHaveBeenCalledWith('u1', 30000, WalletTxType.PAYMENT, expect.any(String), 'order1');
  });

  it('refundToWallet credits wallet with REFUND type', async () => {
    repo.credit.mockResolvedValue(mockWallet);
    await service.refundToWallet('u1', 'order1', 30000);
    expect(repo.credit).toHaveBeenCalledWith('u1', 30000, WalletTxType.REFUND, expect.any(String), 'order1');
  });

  it('adminGetAll delegates to repo', async () => {
    repo.adminFindAll.mockResolvedValue([]);
    await service.adminGetAll();
    expect(repo.adminFindAll).toHaveBeenCalled();
  });

  it('adminGetTopupRequests delegates to repo', async () => {
    repo.adminFindTopupRequests.mockResolvedValue([]);
    await service.adminGetTopupRequests();
    expect(repo.adminFindTopupRequests).toHaveBeenCalled();
  });

  it('approveTopupRequest delegates to repo with admin id', async () => {
    repo.approveTopupRequest.mockResolvedValue({ id: 'topup1', status: 'APPROVED' });
    await service.approveTopupRequest('topup1', 'admin1', 'confirmed');
    expect(repo.approveTopupRequest).toHaveBeenCalledWith('topup1', 'admin1', 'confirmed');
  });

  it('rejectTopupRequest delegates to repo with admin id', async () => {
    repo.rejectTopupRequest.mockResolvedValue({ id: 'topup1', status: 'REJECTED' });
    await service.rejectTopupRequest('topup1', 'admin1', 'invalid transfer');
    expect(repo.rejectTopupRequest).toHaveBeenCalledWith('topup1', 'admin1', 'invalid transfer');
  });

  describe('convertPoints', () => {
    it('throws BadRequestException when insufficient loyalty points', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({ loyaltyPoints: 5 });

      await expect(service.convertPoints('u1', 10)).rejects.toThrow(
        'Không đủ điểm tích lũy. Bạn hiện có 5 điểm, cần 10 điểm',
      );
    });

    it('converts points and returns correct values', async () => {
      const updatedWallet = { ...mockWallet, balanceVnd: 101000 };
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({ loyaltyPoints: 100 });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.wallet.upsert as jest.Mock).mockResolvedValue(updatedWallet);
      (prisma.walletTransaction.create as jest.Mock).mockResolvedValue({});

      const result = await service.convertPoints('u1', 10);

      expect(result.pointsConverted).toBe(10);
      expect(result.amountCredited).toBe(1000); // 10 points × 100 VND
      expect(result.wallet).toBe(updatedWallet);
    });
  });
});

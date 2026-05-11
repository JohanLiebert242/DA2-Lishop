import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { RefundsRepository } from './refunds.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { WalletService } from '../wallet/wallet.service';
import { RefundMethod, RefundStatus } from '@lishop/database';

jest.mock('@lishop/database', () => ({
  RefundMethod: { WALLET: 'WALLET', ORIGINAL_PAYMENT: 'ORIGINAL_PAYMENT', MANUAL: 'MANUAL' },
  RefundStatus: { PENDING: 'PENDING', PROCESSING: 'PROCESSING', COMPLETED: 'COMPLETED', FAILED: 'FAILED' },
}));

const mockRefund: any = {
  id: 'ref1',
  orderId: 'order1',
  userId: 'u1',
  amountVnd: 50000,
  method: 'WALLET',
  status: 'PENDING',
  reason: null,
  returnId: null,
  createdAt: new Date(),
};

describe('RefundsService', () => {
  let service: RefundsService;
  const repo = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
  };
  const walletService = { refundToWallet: jest.fn() };
  const notifRepo = { createNotification: jest.fn() };

  beforeEach(async () => {
    notifRepo.createNotification.mockResolvedValue({});
    const module = await Test.createTestingModule({
      providers: [
        RefundsService,
        { provide: RefundsRepository, useValue: repo },
        { provide: WalletService, useValue: walletService },
        { provide: NotificationsRepository, useValue: notifRepo },
      ],
    }).compile();
    service = module.get(RefundsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getUserRefunds delegates to repo', async () => {
    repo.findByUserId.mockResolvedValue([mockRefund]);
    const result = await service.getUserRefunds('u1');
    expect(repo.findByUserId).toHaveBeenCalledWith('u1');
    expect(result).toHaveLength(1);
  });

  it('getRefund throws NotFoundException when refund not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getRefund('u1', 'ref99')).rejects.toThrow(NotFoundException);
  });

  it('getRefund throws ForbiddenException when refund belongs to another user', async () => {
    repo.findById.mockResolvedValue({ ...mockRefund, userId: 'u2' });
    await expect(service.getRefund('u1', 'ref1')).rejects.toThrow(ForbiddenException);
  });

  it('getRefund returns refund for correct user', async () => {
    repo.findById.mockResolvedValue(mockRefund);
    const result = await service.getRefund('u1', 'ref1');
    expect(result.id).toBe('ref1');
  });

  it('getAllRefunds delegates to repo', async () => {
    repo.findAll.mockResolvedValue([mockRefund]);
    const result = await service.getAllRefunds();
    expect(result).toHaveLength(1);
  });

  it('createRefund creates via repo', async () => {
    repo.create.mockResolvedValue(mockRefund);
    await service.createRefund('order1', 'u1', 50000, 'WALLET', undefined, 'test');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order1',
      userId: 'u1',
      amountVnd: 50000,
      method: 'WALLET',
    }));
  });

  describe('processRefund', () => {
    it('throws NotFoundException when refund not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.processRefund('ref99')).rejects.toThrow(NotFoundException);
    });

    it('credits wallet and marks COMPLETED for WALLET method', async () => {
      repo.findById.mockResolvedValue(mockRefund);
      walletService.refundToWallet.mockResolvedValue({});
      repo.updateStatus.mockResolvedValue({ ...mockRefund, status: 'COMPLETED' });

      const result = await service.processRefund('ref1');

      expect(walletService.refundToWallet).toHaveBeenCalledWith('u1', 'order1', 50000);
      expect(repo.updateStatus).toHaveBeenCalledWith('ref1', RefundStatus.COMPLETED, undefined);
      expect(result.status).toBe('COMPLETED');
    });

    it('marks PROCESSING for ORIGINAL_PAYMENT method', async () => {
      const opRefund = { ...mockRefund, method: 'ORIGINAL_PAYMENT' };
      repo.findById.mockResolvedValue(opRefund);
      repo.updateStatus.mockResolvedValue({ ...opRefund, status: 'PROCESSING' });

      const result = await service.processRefund('ref1', 'admin note');

      expect(walletService.refundToWallet).not.toHaveBeenCalled();
      expect(repo.updateStatus).toHaveBeenCalledWith('ref1', RefundStatus.PROCESSING, 'admin note');
      expect(result.status).toBe('PROCESSING');
    });

    it('sends notification fire-and-forget (does not throw on notification failure)', async () => {
      repo.findById.mockResolvedValue(mockRefund);
      walletService.refundToWallet.mockResolvedValue({});
      repo.updateStatus.mockResolvedValue({ ...mockRefund, status: 'COMPLETED' });
      notifRepo.createNotification.mockRejectedValue(new Error('notif failed'));

      await expect(service.processRefund('ref1')).resolves.not.toThrow();
    });
  });
});

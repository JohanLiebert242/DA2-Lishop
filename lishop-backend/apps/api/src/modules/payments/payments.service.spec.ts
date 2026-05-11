import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { PaymentsGatewayService } from './payments.gateway';

jest.mock('@lishop/database', () => ({
  prisma: {
    payment: { findFirst: jest.fn(), update: jest.fn() },
    order: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
  PaymentStatus: {
    COMPLETED: 'COMPLETED',
    PENDING: 'PENDING',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
  },
  OrderStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED',
  },
  PaymentMethod: {
    COD: 'COD',
    WALLET: 'WALLET',
    VNPAY: 'VNPAY',
    MOMO: 'MOMO',
    ZALOPAY: 'ZALOPAY',
    STRIPE: 'STRIPE',
  },
}));

import { prisma } from '@lishop/database';

const mockPayment: any = {
  id: 'pay1',
  orderId: 'order1',
  method: 'COD',
  amountVnd: 100000,
  status: 'PENDING',
  createdAt: new Date(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  const repo = {
    findByOrderId: jest.fn(),
    findAll: jest.fn(),
    confirmPayment: jest.fn(),
  };
  const gateway = {
    generateVNPayUrl: jest.fn(),
    generateMoMoUrl: jest.fn(),
    generateZaloPayUrl: jest.fn(),
    verifyVNPayReturn: jest.fn(),
    verifyMoMoIpn: jest.fn(),
    verifyZaloPayCallback: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: repo },
        { provide: PaymentsGatewayService, useValue: gateway },
      ],
    }).compile();
    service = module.get(PaymentsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getPayment throws NotFoundException when not found', async () => {
    repo.findByOrderId.mockResolvedValue(null);
    await expect(service.getPayment('u1', 'order99')).rejects.toThrow(NotFoundException);
  });

  it('getPayment returns payment', async () => {
    repo.findByOrderId.mockResolvedValue(mockPayment);
    const result = await service.getPayment('u1', 'order1');
    expect(result.id).toBe('pay1');
  });

  describe('initiatePayment', () => {
    it('throws NotFoundException when payment not found', async () => {
      repo.findByOrderId.mockResolvedValue(null);
      await expect(service.initiatePayment('u1', 'order99')).rejects.toThrow(NotFoundException);
    });

    it('returns COMPLETED status for already completed payment', async () => {
      repo.findByOrderId.mockResolvedValue({ ...mockPayment, status: 'COMPLETED' });
      const result = await service.initiatePayment('u1', 'order1');
      expect(result.status).toBe('COMPLETED');
      expect(result.paymentUrl).toBeNull();
    });

    it('returns null paymentUrl for COD payment', async () => {
      repo.findByOrderId.mockResolvedValue({ ...mockPayment, method: 'COD' });
      const result = await service.initiatePayment('u1', 'order1');
      expect(result.paymentUrl).toBeNull();
      expect(result.status).toBe('PENDING');
    });

    it('returns null paymentUrl for WALLET payment', async () => {
      repo.findByOrderId.mockResolvedValue({ ...mockPayment, method: 'WALLET' });
      const result = await service.initiatePayment('u1', 'order1');
      expect(result.paymentUrl).toBeNull();
    });

    it('generates VNPay URL for VNPAY payment', async () => {
      repo.findByOrderId.mockResolvedValue({ ...mockPayment, method: 'VNPAY' });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order1', orderNumber: 'LS-001', user: {} });
      gateway.generateVNPayUrl.mockReturnValue('https://vnpay.url');
      const result = await service.initiatePayment('u1', 'order1', '127.0.0.1');
      expect(result.paymentUrl).toBe('https://vnpay.url');
    });

    it('generates MoMo URL for MOMO payment', async () => {
      repo.findByOrderId.mockResolvedValue({ ...mockPayment, method: 'MOMO' });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order1', orderNumber: 'LS-001', user: {} });
      gateway.generateMoMoUrl.mockResolvedValue({ payUrl: 'https://momo.url' });
      const result = await service.initiatePayment('u1', 'order1');
      expect(result.paymentUrl).toBe('https://momo.url');
    });
  });

  it('getAllPayments delegates to repo', async () => {
    repo.findAll.mockResolvedValue([mockPayment]);
    const result = await service.getAllPayments();
    expect(result).toHaveLength(1);
  });

  it('confirmPaymentAdmin delegates to repo', async () => {
    repo.confirmPayment.mockResolvedValue({ ...mockPayment, status: 'COMPLETED' });
    const result = await service.confirmPaymentAdmin('order1');
    expect(repo.confirmPayment).toHaveBeenCalledWith('order1');
    expect(result.status).toBe('COMPLETED');
  });

  describe('handleVNPayReturn', () => {
    it('returns failure when signature is invalid', async () => {
      gateway.verifyVNPayReturn.mockReturnValue(false);
      const result = await service.handleVNPayReturn({ vnp_TxnRef: 'abc12300000001', vnp_ResponseCode: '00' });
      expect(result.success).toBe(false);
    });

    it('updates payment and order on successful return', async () => {
      gateway.verifyVNPayReturn.mockReturnValue(true);
      const paymentRecord = { orderId: 'order1' };
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(paymentRecord);
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);

      const result = await service.handleVNPayReturn({
        vnp_TxnRef: 'order100000001',
        vnp_ResponseCode: '00',
      });

      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});

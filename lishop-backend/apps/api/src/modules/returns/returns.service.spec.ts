import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsRepository } from './returns.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { RefundsService } from '../refunds/refunds.service';
import { OrderStatus, ReturnStatus } from '@lishop/database';

jest.mock('@lishop/database', () => ({
  prisma: {
    order: { findFirst: jest.fn(), findUnique: jest.fn() },
    returnRequest: { findFirst: jest.fn() },
    orderItem: { findFirst: jest.fn() },
  },
  OrderStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED',
  },
  ReturnStatus: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    RECEIVED: 'RECEIVED',
    COMPLETED: 'COMPLETED',
  },
  PaymentMethod: {
    COD: 'COD',
    WALLET: 'WALLET',
    VNPAY: 'VNPAY',
    MOMO: 'MOMO',
  },
  RefundMethod: {
    WALLET: 'WALLET',
    ORIGINAL_PAYMENT: 'ORIGINAL_PAYMENT',
    MANUAL: 'MANUAL',
  },
}));

import { prisma } from '@lishop/database';

const now = new Date();
const recentDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

const mockOrder: any = {
  id: 'order1',
  userId: 'u1',
  status: 'DELIVERED',
  updatedAt: recentDate,
  shipment: { deliveredAt: recentDate },
};

const mockOrderItem: any = {
  id: 'item1',
  orderId: 'order1',
  productName: 'iPhone 15',
  quantity: 2,
};

const mockReturn: any = {
  id: 'ret1',
  orderId: 'order1',
  userId: 'u1',
  reason: 'DAMAGED',
  status: 'PENDING',
  items: [],
  createdAt: new Date(),
};

const createDto = {
  orderId: 'order1',
  reason: 'DAMAGED' as any,
  description: 'Hàng bị hỏng',
  items: [{ orderItemId: 'item1', quantity: 1 }],
};

describe('ReturnsService', () => {
  let service: ReturnsService;
  const repo = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    updateStatus: jest.fn(),
  };
  const notifRepo = { createNotification: jest.fn() };
  const refundsService = { createRefund: jest.fn() };

  beforeEach(async () => {
    notifRepo.createNotification.mockResolvedValue({});
    refundsService.createRefund.mockResolvedValue({});

    const module = await Test.createTestingModule({
      providers: [
        ReturnsService,
        { provide: ReturnsRepository, useValue: repo },
        { provide: NotificationsRepository, useValue: notifRepo },
        { provide: RefundsService, useValue: refundsService },
      ],
    }).compile();
    service = module.get(ReturnsService);
  });

  afterEach(() => jest.resetAllMocks());

  describe('createReturn', () => {
    it('throws NotFoundException when order not found', async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.createReturn('u1', createDto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when order is not DELIVERED', async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'SHIPPED' });
      await expect(service.createReturn('u1', createDto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when outside 7-day return window', async () => {
      const oldDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
      (prisma.order.findFirst as jest.Mock).mockResolvedValue({
        ...mockOrder,
        shipment: { deliveredAt: oldDate },
      });
      await expect(service.createReturn('u1', createDto)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when active return request exists', async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.returnRequest.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });
      await expect(service.createReturn('u1', createDto)).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when order item not found', async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.returnRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.createReturn('u1', createDto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when return quantity exceeds ordered quantity', async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.returnRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue({ ...mockOrderItem, quantity: 1 });
      const dto = { ...createDto, items: [{ orderItemId: 'item1', quantity: 3 }] };
      await expect(service.createReturn('u1', dto)).rejects.toThrow(BadRequestException);
    });

    it('creates return request successfully', async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.returnRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue(mockOrderItem);
      repo.create.mockResolvedValue(mockReturn);

      const result = await service.createReturn('u1', createDto);

      expect(repo.create).toHaveBeenCalledWith('u1', 'order1', 'DAMAGED', 'Hàng bị hỏng', createDto.items);
      expect(result.id).toBe('ret1');
    });
  });

  it('getMyReturns delegates to repo', async () => {
    repo.findByUserId.mockResolvedValue([mockReturn]);
    const result = await service.getMyReturns('u1');
    expect(result).toHaveLength(1);
  });

  it('getMyReturn throws NotFoundException when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getMyReturn('u1', 'ret99')).rejects.toThrow(NotFoundException);
  });

  it('getMyReturn throws ForbiddenException for wrong user', async () => {
    repo.findById.mockResolvedValue({ ...mockReturn, userId: 'u2' });
    await expect(service.getMyReturn('u1', 'ret1')).rejects.toThrow(ForbiddenException);
  });

  it('getAllReturns delegates to repo', async () => {
    repo.findAll.mockResolvedValue([mockReturn]);
    const result = await service.getAllReturns();
    expect(result).toHaveLength(1);
  });

  describe('updateReturnStatus', () => {
    it('throws NotFoundException when return not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.updateReturnStatus('ret99', { status: ReturnStatus.APPROVED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates refund when status is COMPLETED and order has wallet payment', async () => {
      repo.findById.mockResolvedValue(mockReturn);
      repo.updateStatus.mockResolvedValue({ ...mockReturn, status: 'COMPLETED' });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order1',
        payment: { method: 'WALLET', amountVnd: 50000 },
      });

      await service.updateReturnStatus('ret1', { status: ReturnStatus.COMPLETED });

      expect(refundsService.createRefund).toHaveBeenCalledWith(
        'order1',
        'u1',
        50000,
        'WALLET',
        'ret1',
        expect.any(String),
      );
    });

    it('notifies user on status update', async () => {
      repo.findById.mockResolvedValue(mockReturn);
      repo.updateStatus.mockResolvedValue({ ...mockReturn, status: 'APPROVED' });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await service.updateReturnStatus('ret1', { status: ReturnStatus.APPROVED });

      expect(notifRepo.createNotification).toHaveBeenCalledWith(
        'u1',
        expect.any(String),
        expect.any(String),
        'ORDER_STATUS',
        'order1',
      );
    });
  });
});

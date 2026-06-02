import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { InvoicesService } from '../invoices/invoices.service';
import { RedisService } from '../redis/redis.service';
import { OrderStatus } from '@lishop/database';

const mockStats = { orderCount: 10, revenueVnd: 5000000, userCount: 20, productCount: 30 };
const mockOrder = {
  id: 'o1', orderNumber: 'LS-1', status: OrderStatus.PENDING, totalVnd: 500000,
  createdAt: new Date(), itemCount: 2,
  user: { email: 'a@b.com', firstName: 'A', lastName: 'B' },
};
const mockUser = {
  id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B',
  role: 'CUSTOMER', loyaltyPoints: 0, createdAt: new Date(),
};

const mockCoupon = {
  id: 'c1', code: 'TEST10', type: 'PERCENT', value: 10,
  minOrderVnd: 0, maxUses: null, usedCount: 0,
  expiresAt: null, isActive: true, createdAt: new Date(),
};

const mockAnalytics = {
  dailyRevenue: [{ date: '2026-04-10', amount: 500000 }],
  topProducts: [{ productId: 'p1', productName: 'Sản phẩm A', revenue: 500000 }],
};

describe('AdminService', () => {
  let service: AdminService;
  const repo = {
    getStats: jest.fn(),
    findAllOrders: jest.fn(),
    findOrderById: jest.fn(),
    updateOrderStatus: jest.fn(),
    findAllUsers: jest.fn(),
    listCoupons: jest.fn(),
    createCoupon: jest.fn(),
    toggleCoupon: jest.fn(),
    getAnalytics: jest.fn(),
  };
  const notifRepo = { createNotification: jest.fn() };
  const invoicesService = { generateForOrder: jest.fn() };
  const redisService = { get: jest.fn(), setex: jest.fn() };

  beforeEach(async () => {
    notifRepo.createNotification.mockResolvedValue(undefined);
    invoicesService.generateForOrder.mockResolvedValue(undefined);
    redisService.get.mockResolvedValue(null);
    redisService.setex.mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: repo },
        { provide: NotificationsRepository, useValue: notifRepo },
        { provide: InvoicesService, useValue: invoicesService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();
    service = module.get(AdminService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getStats returns platform stats', async () => {
    repo.getStats.mockResolvedValue(mockStats);
    const result = await service.getStats();
    expect(result).toEqual(mockStats);
  });

  it('listOrders returns all orders', async () => {
    repo.findAllOrders.mockResolvedValue([mockOrder]);
    const result = await service.listOrders();
    expect(result).toHaveLength(1);
  });

  it('updateOrderStatus throws NotFoundException when order not found', async () => {
    repo.findOrderById.mockResolvedValue(null);
    await expect(service.updateOrderStatus('o99', OrderStatus.SHIPPED)).rejects.toThrow(NotFoundException);
  });

  it('updateOrderStatus updates and returns order', async () => {
    repo.findOrderById.mockResolvedValue({ id: 'o1', userId: 'u1', orderNumber: 'LS-1', status: OrderStatus.PENDING });
    repo.updateOrderStatus.mockResolvedValue({ ...mockOrder, status: OrderStatus.PROCESSING });
    const result = await service.updateOrderStatus('o1', OrderStatus.PROCESSING);
    expect(repo.updateOrderStatus).toHaveBeenCalledWith('o1', OrderStatus.PROCESSING);
    expect(result.status).toBe(OrderStatus.PROCESSING);
  });

  it('listUsers returns all users', async () => {
    repo.findAllUsers.mockResolvedValue([mockUser]);
    const result = await service.listUsers();
    expect(result).toHaveLength(1);
  });

  it('listCoupons returns all coupons', async () => {
    repo.listCoupons.mockResolvedValue([mockCoupon]);
    const result = await service.listCoupons();
    expect(repo.listCoupons).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('createCoupon delegates to repository', async () => {
    repo.createCoupon.mockResolvedValue(mockCoupon);
    const dto = { code: 'TEST10', type: 'PERCENT', value: 10 };
    const result = await service.createCoupon(dto);
    expect(repo.createCoupon).toHaveBeenCalledWith(dto);
    expect(result.code).toBe('TEST10');
  });

  it('toggleCoupon throws NotFoundException when coupon not found', async () => {
    repo.toggleCoupon.mockResolvedValue(null);
    await expect(service.toggleCoupon('notfound')).rejects.toThrow(NotFoundException);
  });

  it('getAnalytics returns daily revenue and top products', async () => {
    repo.getAnalytics.mockResolvedValue(mockAnalytics);
    const result = await service.getAnalytics();
    expect(result.dailyRevenue).toHaveLength(1);
    expect(result.topProducts).toHaveLength(1);
  });
});

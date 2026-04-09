import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
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

describe('AdminService', () => {
  let service: AdminService;
  const repo = {
    getStats: jest.fn(),
    findAllOrders: jest.fn(),
    findOrderById: jest.fn(),
    updateOrderStatus: jest.fn(),
    findAllUsers: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AdminService, { provide: AdminRepository, useValue: repo }],
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
    repo.findOrderById.mockResolvedValue({ id: 'o1', status: OrderStatus.PENDING });
    repo.updateOrderStatus.mockResolvedValue({ ...mockOrder, status: OrderStatus.SHIPPED });
    const result = await service.updateOrderStatus('o1', OrderStatus.SHIPPED);
    expect(repo.updateOrderStatus).toHaveBeenCalledWith('o1', OrderStatus.SHIPPED);
    expect(result.status).toBe(OrderStatus.SHIPPED);
  });

  it('listUsers returns all users', async () => {
    repo.findAllUsers.mockResolvedValue([mockUser]);
    const result = await service.listUsers();
    expect(result).toHaveLength(1);
  });
});

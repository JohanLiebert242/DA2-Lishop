import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { InvoicesService } from '../invoices/invoices.service';
import { RedisService } from '../redis/redis.service';
import { ProductsService } from '../products/products.service';
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
  const originalFetch = global.fetch;
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
  const productsService = { create: jest.fn() };
  const config = { get: jest.fn() };

  beforeEach(async () => {
    notifRepo.createNotification.mockResolvedValue(undefined);
    invoicesService.generateForOrder.mockResolvedValue(undefined);
    redisService.get.mockResolvedValue(null);
    redisService.setex.mockResolvedValue(undefined);
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    global.fetch = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: repo },
        { provide: NotificationsRepository, useValue: notifRepo },
        { provide: InvoicesService, useValue: invoicesService },
        { provide: RedisService, useValue: redisService },
        { provide: ProductsService, useValue: productsService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(AdminService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

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

  it('importProducts creates products and returns a summary', async () => {
    productsService.create.mockResolvedValue({ id: 'p1' });
    const result = await service.importProducts({
      products: [{
        name: 'Imported product',
        description: 'Imported description',
        priceVnd: 100000,
        priceUsd: 400,
        stock: 5,
        categoryId: '11111111-1111-1111-1111-111111111111',
      }],
    });

    expect(productsService.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Imported product',
      categoryId: '11111111-1111-1111-1111-111111111111',
      weightGrams: 500,
    }));
    expect(result).toEqual({ created: 1, failed: 0, errors: [] });
  });

  it('generateProductCopy uses OpenAI when configured', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: 'Mo ta AI cho Ao khoac Lishop voi chat lieu mem va form gon.' }),
    });

    const result = await service.generateProductCopy({
      name: 'Ao khoac Lishop',
      categoryName: 'Thoi trang',
      priceVnd: 399000,
      stock: 12,
      description: 'chat lieu mem',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }),
      }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(JSON.stringify(body)).toContain('Ao khoac Lishop');
    expect(result).toEqual({
      description: 'Mo ta AI cho Ao khoac Lishop voi chat lieu mem va form gon.',
      fallback: false,
    });
  });

  it('generateProductCopy returns fallback when OpenAI key is missing', async () => {
    const result = await service.generateProductCopy({
      name: 'Balo du lich',
      categoryName: 'Phu kien',
      priceVnd: 299000,
      stock: 6,
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.fallback).toBe(true);
    expect(result.description).toContain('Balo du lich');
  });

  it('generateProductCopy falls back when OpenAI fails', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    const result = await service.generateProductCopy({ name: 'Tai nghe Bluetooth' });

    expect(result.fallback).toBe(true);
    expect(result.description).toContain('Tai nghe Bluetooth');
  });

  it('aiImportEnrichProducts returns fallback enriched products when OpenAI key is missing', async () => {
    const csv = [
      'name,sku,description,priceVnd,priceUsd,stock,weightGrams,categorySlug,imageUrl,tags',
      'Ao thun,TS-001,,199000,799,10,200,thoi-trang,https://example.com/a.jpg,ao|thun',
    ].join('\n');

    const result = await service.aiImportEnrichProducts({ rawText: csv });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.fallback).toBe(true);
    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.name).toBe('Ao thun');
    expect(result.products[0]?.description).toContain('Ao thun');
    expect(result.products[0]?.priceVnd).toBe(199000);
  });

  it('aiImportEnrichProducts uses OpenAI when configured', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          products: [
            { name: 'Balo AI', description: 'Mo ta ngan.', priceVnd: 299000, priceUsd: 1199, stock: 7 },
          ],
        }),
      }),
    });

    const result = await service.aiImportEnrichProducts({ rawText: 'Balo du lich gia 299k ton 7' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }),
      }),
    );
    expect(result.fallback).toBe(false);
    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.name).toBe('Balo AI');
  });
});

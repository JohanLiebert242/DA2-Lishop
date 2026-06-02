import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartRepository } from './cart.repository';
import { CouponsService } from '../promotions/coupons.service';
import { RedisService } from '../redis/redis.service';

const makeRow = (overrides: Partial<any> = {}): any => ({
  id: 'ci1',
  productId: 'p1',
  variantId: null,
  quantity: 2,
  product: {
    id: 'p1',
    name: 'iPhone 15',
    slug: 'iphone-15',
    priceVnd: 20000000,
    priceUsd: 800,
    stock: 5,
    weightGrams: 500,
    images: [{ url: 'https://img.jpg' }],
  },
  variant: null,
  ...overrides,
});

describe('CartService', () => {
  let service: CartService;
  const repo = {
    findByUserId: jest.fn(),
    addOrUpdate: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    findProduct: jest.fn(),
  };
  const couponsService = { tryValidate: jest.fn() };
  const redis = { get: jest.fn(), setex: jest.fn(), del: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: CartRepository, useValue: repo },
        { provide: CouponsService, useValue: couponsService },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();
    service = module.get(CartService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getCart returns empty cart when no items', async () => {
    repo.findByUserId.mockResolvedValue([]);
    redis.get.mockResolvedValue(null);
    const cart = await service.getCart('u1');
    expect(cart.items).toHaveLength(0);
    expect(cart.subtotalVnd).toBe(0);
    expect(cart.totalVnd).toBe(0);
    expect(cart.couponCode).toBeNull();
    expect(cart.discountVnd).toBe(0);
  });

  it('getCart computes subtotals from items', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue(null);
    const cart = await service.getCart('u1');
    expect(cart.subtotalVnd).toBe(40000000); // 20000000 * 2
    expect(cart.totalVnd).toBe(40000000);
  });

  it('getCart applies stored coupon discount from Redis', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue('SAVE10');
    couponsService.tryValidate.mockResolvedValue({ discountVnd: 4000000, coupon: { id: 'c1', code: 'SAVE10', type: 'PERCENT', value: 10 } });
    const cart = await service.getCart('u1');
    expect(cart.couponCode).toBe('SAVE10');
    expect(cart.discountVnd).toBe(4000000);
    expect(cart.totalVnd).toBe(36000000);
  });

  it('getCart silently clears invalid Redis coupon', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue('EXPIRED');
    couponsService.tryValidate.mockResolvedValue(null);
    const cart = await service.getCart('u1');
    expect(cart.couponCode).toBeNull();
    expect(redis.del).toHaveBeenCalledWith('cart:coupon:u1');
  });

  it('addItem throws NotFoundException when product not found', async () => {
    repo.findProduct.mockResolvedValue(null);
    await expect(service.addItem('u1', { productId: 'p99', quantity: 1 })).rejects.toThrow(NotFoundException);
  });

  it('addItem throws BadRequestException when insufficient stock', async () => {
    repo.findProduct.mockResolvedValue({ id: 'p1', stock: 1, variants: [] });
    await expect(service.addItem('u1', { productId: 'p1', quantity: 5 })).rejects.toThrow(BadRequestException);
  });

  it('addItem calls addOrUpdate and returns updated cart', async () => {
    repo.findProduct.mockResolvedValue({ id: 'p1', stock: 10, variants: [] });
    repo.addOrUpdate.mockResolvedValue(undefined);
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue(null);
    const cart = await service.addItem('u1', { productId: 'p1', quantity: 2 });
    expect(repo.addOrUpdate).toHaveBeenCalledWith('u1', 'p1', null, 2);
    expect(cart.items).toHaveLength(1);
  });

  it('addItem uses selected variant and cart totals use variant price', async () => {
    const variant = {
      id: 'v1',
      productId: 'p1',
      sku: 'IPHONE15PM-512-BLUE',
      name: 'Blue Titanium 512GB',
      priceVnd: 39990000,
      priceUsd: 1599,
      stock: 4,
      weightGrams: 240,
      attributes: { color: 'Blue Titanium', storage: '512GB' },
      imageUrl: 'https://variant.jpg',
      isDefault: false,
      isActive: true,
    };
    repo.findProduct.mockResolvedValue({ id: 'p1', stock: 10, variants: [variant] });
    repo.addOrUpdate.mockResolvedValue(undefined);
    repo.findByUserId.mockResolvedValue([makeRow({ variantId: 'v1', variant })]);
    redis.get.mockResolvedValue(null);

    const cart = await service.addItem('u1', { productId: 'p1', variantId: 'v1', quantity: 2 });

    expect(repo.addOrUpdate).toHaveBeenCalledWith('u1', 'p1', 'v1', 2);
    expect(cart.items).toHaveLength(1);
    const item = cart.items[0]!;
    expect(item.variantName).toBe('Blue Titanium 512GB');
    expect(item.priceVnd).toBe(39990000);
    expect(cart.subtotalVnd).toBe(79980000);
  });

  it('applyCoupon stores code in Redis and returns cart with discount', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue(null);
    const validResult = { discountVnd: 4000000, coupon: { id: 'c1', code: 'SAVE10', type: 'PERCENT', value: 10 } };
    couponsService.tryValidate
      .mockResolvedValueOnce(validResult)
      .mockResolvedValueOnce(validResult);
    const cart = await service.applyCoupon('u1', 'SAVE10');
    expect(redis.setex).toHaveBeenCalledWith('cart:coupon:u1', 86400, 'SAVE10');
    expect(cart.discountVnd).toBe(4000000);
  });

  it('applyCoupon throws when coupon invalid', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue(null);
    couponsService.tryValidate.mockResolvedValue(null);
    await expect(service.applyCoupon('u1', 'FAKE')).rejects.toThrow(BadRequestException);
  });

  it('removeCoupon clears Redis and returns cart without discount', async () => {
    repo.findByUserId.mockResolvedValue([makeRow()]);
    redis.get.mockResolvedValue(null);
    const cart = await service.removeCoupon('u1');
    expect(redis.del).toHaveBeenCalledWith('cart:coupon:u1');
    expect(cart.discountVnd).toBe(0);
  });
});

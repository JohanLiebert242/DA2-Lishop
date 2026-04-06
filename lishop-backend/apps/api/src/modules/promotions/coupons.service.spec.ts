import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsRepository } from './coupons.repository';

const makeCoupon = (overrides: Partial<any> = {}): any => ({
  id: 'coupon-1',
  code: 'SAVE10',
  type: 'PERCENT',
  value: 10,
  minOrderVnd: 100000,
  maxUses: null,
  usedCount: 0,
  expiresAt: null,
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

describe('CouponsService', () => {
  let service: CouponsService;
  const repo = {
    findByCode: jest.fn(),
    findById: jest.fn(),
    hasUsed: jest.fn(),
    recordUsage: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CouponsService, { provide: CouponsRepository, useValue: repo }],
    }).compile();
    service = module.get(CouponsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('validateCoupon throws when coupon not found', async () => {
    repo.findByCode.mockResolvedValue(null);
    await expect(service.validateCoupon('FAKE', 'u1', 500000)).rejects.toThrow(BadRequestException);
  });

  it('validateCoupon throws when inactive', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon({ isActive: false }));
    await expect(service.validateCoupon('SAVE10', 'u1', 500000)).rejects.toThrow(BadRequestException);
  });

  it('validateCoupon throws when expired', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon({ expiresAt: new Date('2000-01-01') }));
    await expect(service.validateCoupon('SAVE10', 'u1', 500000)).rejects.toThrow(BadRequestException);
  });

  it('validateCoupon throws when below minimum order', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon({ minOrderVnd: 1000000 }));
    repo.hasUsed.mockResolvedValue(false);
    await expect(service.validateCoupon('SAVE10', 'u1', 500000)).rejects.toThrow(BadRequestException);
  });

  it('validateCoupon throws when already used by user', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon());
    repo.hasUsed.mockResolvedValue(true);
    await expect(service.validateCoupon('SAVE10', 'u1', 500000)).rejects.toThrow(BadRequestException);
  });

  it('validateCoupon returns coupon and PERCENT discount', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon({ type: 'PERCENT', value: 10 }));
    repo.hasUsed.mockResolvedValue(false);
    const result = await service.validateCoupon('SAVE10', 'u1', 500000);
    expect(result.coupon.code).toBe('SAVE10');
    expect(result.discountVnd).toBe(50000); // 10% of 500000
  });

  it('validateCoupon returns FIXED discount capped at subtotal', async () => {
    repo.findByCode.mockResolvedValue(makeCoupon({ type: 'FIXED', value: 200000 }));
    repo.hasUsed.mockResolvedValue(false);
    const result = await service.validateCoupon('SAVE10', 'u1', 150000);
    expect(result.discountVnd).toBe(150000); // capped at subtotal
  });

  it('tryValidate returns null when coupon invalid', async () => {
    repo.findByCode.mockResolvedValue(null);
    const result = await service.tryValidate('FAKE', 'u1', 500000);
    expect(result).toBeNull();
  });

  it('calculateDiscount FREE_SHIPPING returns 0', () => {
    const coupon = makeCoupon({ type: 'FREE_SHIPPING', value: 0 });
    expect(service.calculateDiscount(coupon, 500000)).toBe(0);
  });
});

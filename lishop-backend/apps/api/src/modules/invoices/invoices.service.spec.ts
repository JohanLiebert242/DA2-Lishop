import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';

jest.mock('@lishop/database', () => ({
  prisma: {
    order: { findUnique: jest.fn() },
  },
}));

import { prisma } from '@lishop/database';

const mockInvoice: any = {
  id: 'inv1',
  orderId: 'order1',
  userId: 'u1',
  invoiceNo: 'INV-2026-0001',
  billingName: 'Nguyen Van A',
  billingEmail: 'a@test.com',
  billingAddress: '123 Main, Q1, HCM, VN',
  billingPhone: '09012345',
  subtotalVnd: 100000,
  discountVnd: 0,
  shippingFeeVnd: 20000,
  vatPercent: 10,
  vatVnd: 11000,
  totalVnd: 120000,
  issuedAt: new Date(),
};

const mockOrder: any = {
  id: 'order1',
  userId: 'u1',
  totalVnd: 120000,
  discountVnd: 0,
  shippingFeeVnd: 20000,
  user: { firstName: 'Nguyen', lastName: 'Van A', email: 'a@test.com' },
  address: {
    fullName: 'Nguyen Van A',
    phone: '09012345',
    street: '123 Main',
    district: 'Q1',
    city: 'HCM',
    country: 'VN',
  },
  items: [
    { productName: 'iPhone', quantity: 1, unitPriceVnd: 100000, totalPriceVnd: 100000 },
  ],
};

describe('InvoicesService', () => {
  let service: InvoicesService;
  const repo = {
    findByOrderId: jest.fn(),
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [InvoicesService, { provide: InvoicesRepository, useValue: repo }],
    }).compile();
    service = module.get(InvoicesService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getInvoiceForOrder throws NotFoundException when not found', async () => {
    repo.findByOrderId.mockResolvedValue(null);
    await expect(service.getInvoiceForOrder('u1', 'order99')).rejects.toThrow(NotFoundException);
  });

  it('getInvoiceForOrder returns invoice for owner', async () => {
    repo.findByOrderId.mockResolvedValue(mockInvoice);
    const result = await service.getInvoiceForOrder('u1', 'order1');
    expect(repo.findByOrderId).toHaveBeenCalledWith('order1', 'u1');
    expect(result.id).toBe('inv1');
  });

  it('getUserInvoices delegates to repo', async () => {
    repo.findByUserId.mockResolvedValue([mockInvoice]);
    const result = await service.getUserInvoices('u1');
    expect(result).toHaveLength(1);
  });

  it('getAllInvoices delegates to repo', async () => {
    repo.findAll.mockResolvedValue([mockInvoice]);
    const result = await service.getAllInvoices();
    expect(result).toHaveLength(1);
  });

  describe('generateForOrder', () => {
    it('returns existing invoice without creating new one (idempotent)', async () => {
      repo.findByOrderId.mockResolvedValue(mockInvoice);
      const result = await service.generateForOrder('order1');
      expect(repo.create).not.toHaveBeenCalled();
      expect(result.id).toBe('inv1');
    });

    it('throws NotFoundException when order not found', async () => {
      repo.findByOrderId.mockResolvedValue(null);
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.generateForOrder('order99')).rejects.toThrow(NotFoundException);
    });

    it('creates invoice with correct billing info', async () => {
      repo.findByOrderId.mockResolvedValue(null);
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      repo.create.mockResolvedValue(mockInvoice);

      await service.generateForOrder('order1');

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        orderId: 'order1',
        billingName: 'Nguyen Van A',
        billingEmail: 'a@test.com',
        totalVnd: 120000,
        vatPercent: 10,
      }));
    });

    it('calculates VAT correctly from total (back-calculation)', async () => {
      repo.findByOrderId.mockResolvedValue(null);
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      repo.create.mockResolvedValue(mockInvoice);

      await service.generateForOrder('order1');

      const createCall = (repo.create as jest.Mock).mock.calls[0]![0];
      // vatVnd = floor(120000 * 10 / 110) = floor(10909.09) = 10909
      expect(createCall.vatVnd).toBe(Math.floor(120000 * 10 / 110));
    });
  });
});

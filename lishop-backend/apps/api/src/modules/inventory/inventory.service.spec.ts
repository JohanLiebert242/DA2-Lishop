import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';

jest.mock('@lishop/database', () => ({
  prisma: {
    product: { findUnique: jest.fn() },
  },
}));

import { prisma } from '@lishop/database';

const mockProduct: any = { id: 'p1', stock: 10 };

const mockStockItem: any = {
  id: 'p1',
  name: 'iPhone 15',
  slug: 'iphone-15',
  stock: 10,
  weightGrams: 200,
  isLowStock: false,
  lastMovement: null,
};

describe('InventoryService', () => {
  let service: InventoryService;
  const inventoryRepo = {
    findAll: jest.fn(),
    adjustStock: jest.fn(),
    findMovements: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryRepository, useValue: inventoryRepo },
      ],
    }).compile();
    service = module.get(InventoryService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getAll delegates to repo', async () => {
    inventoryRepo.findAll.mockResolvedValue([mockStockItem]);
    const result = await service.getAll();
    expect(inventoryRepo.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  describe('adjustStock', () => {
    it('throws NotFoundException when product not found', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.adjustStock('p99', 5)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when adjustment brings stock below 0', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      await expect(service.adjustStock('p1', -15)).rejects.toThrow(BadRequestException);
    });

    it('delegates to repo when adjustment is valid', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      inventoryRepo.adjustStock.mockResolvedValue({ ...mockProduct, stock: 15 });
      await service.adjustStock('p1', 5, 'restock');
      expect(inventoryRepo.adjustStock).toHaveBeenCalledWith('p1', 5, 'restock');
    });

    it('allows zeroing out stock (delta = -stock)', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      inventoryRepo.adjustStock.mockResolvedValue({ ...mockProduct, stock: 0 });
      await service.adjustStock('p1', -10);
      expect(inventoryRepo.adjustStock).toHaveBeenCalledWith('p1', -10, undefined);
    });
  });

  describe('getMovements', () => {
    it('throws NotFoundException when product not found', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getMovements('p99')).rejects.toThrow(NotFoundException);
    });

    it('returns movements for existing product', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
      inventoryRepo.findMovements.mockResolvedValue([{ id: 'm1', delta: 5 }]);
      const result = await service.getMovements('p1');
      expect(inventoryRepo.findMovements).toHaveBeenCalledWith('p1');
      expect(result).toHaveLength(1);
    });
  });
});

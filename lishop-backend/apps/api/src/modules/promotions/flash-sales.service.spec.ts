import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FlashSalesService } from './flash-sales.service';
import { FlashSalesRepository } from './flash-sales.repository';
import { RealtimeService } from '../realtime/realtime.service';

const mockSale: any = {
  id: 'sale1',
  startAt: new Date('2026-06-01T00:00:00Z'),
  endAt: new Date('2026-06-02T00:00:00Z'),
  isActive: true,
  items: [],
};

describe('FlashSalesService', () => {
  let service: FlashSalesService;
  const repo = {
    findActive: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FlashSalesService,
        { provide: FlashSalesRepository, useValue: repo },
        { provide: RealtimeService, useValue: { emitFlashSaleUpdate: jest.fn() } },
      ],
    }).compile();
    service = module.get(FlashSalesService);
  });

  afterEach(() => jest.resetAllMocks());

  it('findActive delegates to repo', async () => {
    repo.findActive.mockResolvedValue([mockSale]);
    const result = await service.findActive();
    expect(repo.findActive).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('findAll delegates to repo', async () => {
    repo.findAll.mockResolvedValue([mockSale]);
    const result = await service.findAll();
    expect(result).toHaveLength(1);
  });

  it('create passes parsed dates and isActive to repo', async () => {
    repo.create.mockResolvedValue(mockSale);
    await service.create({
      startAt: '2026-06-01T00:00:00Z',
      endAt: '2026-06-02T00:00:00Z',
      isActive: true,
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      startAt: expect.any(Date),
      endAt: expect.any(Date),
      isActive: true,
    }));
  });

  it('update throws NotFoundException when sale not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.update('sale99', {})).rejects.toThrow(NotFoundException);
  });

  it('update updates existing sale', async () => {
    repo.findById.mockResolvedValue(mockSale);
    repo.update.mockResolvedValue({ ...mockSale, isActive: false });
    const result = await service.update('sale1', { isActive: false });
    expect(repo.update).toHaveBeenCalledWith('sale1', expect.objectContaining({ isActive: false }));
    expect(result.isActive).toBe(false);
  });

  it('update passes parsed dates when provided', async () => {
    repo.findById.mockResolvedValue(mockSale);
    repo.update.mockResolvedValue(mockSale);
    await service.update('sale1', { startAt: '2026-07-01T00:00:00Z', endAt: '2026-07-02T00:00:00Z' });
    expect(repo.update).toHaveBeenCalledWith('sale1', expect.objectContaining({
      startAt: expect.any(Date),
      endAt: expect.any(Date),
    }));
  });

  it('delete throws NotFoundException when sale not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.delete('sale99')).rejects.toThrow(NotFoundException);
  });

  it('delete deletes existing sale', async () => {
    repo.findById.mockResolvedValue(mockSale);
    repo.delete.mockResolvedValue(undefined);
    await service.delete('sale1');
    expect(repo.delete).toHaveBeenCalledWith('sale1');
  });

  it('addItem throws NotFoundException when sale not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.addItem('sale99', 'p1', 20)).rejects.toThrow(NotFoundException);
  });

  it('addItem adds product to sale', async () => {
    repo.findById.mockResolvedValue(mockSale);
    repo.addItem.mockResolvedValue({ ...mockSale, items: [{ id: 'item1', product: { id: 'p1' }, discountPercent: 20 }] });
    const result = await service.addItem('sale1', 'p1', 20);
    expect(repo.addItem).toHaveBeenCalledWith('sale1', 'p1', 20);
    expect(result.items).toHaveLength(1);
  });

  it('removeItem throws NotFoundException when sale not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.removeItem('sale99', 'item1')).rejects.toThrow(NotFoundException);
  });

  it('removeItem removes item from sale', async () => {
    repo.findById.mockResolvedValue(mockSale);
    repo.removeItem.mockResolvedValue({ ...mockSale, items: [] });
    await service.removeItem('sale1', 'item1');
    expect(repo.removeItem).toHaveBeenCalledWith('sale1', 'item1');
  });
});

import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistRepository } from './wishlist.repository';

describe('WishlistService', () => {
  let service: WishlistService;
  const repo = {
    findIdsByUserId: jest.fn(),
    findProductsByUserId: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: WishlistRepository, useValue: repo },
      ],
    }).compile();
    service = module.get(WishlistService);
  });

  afterEach(() => jest.resetAllMocks());

  describe('getWishlistIds', () => {
    it('returns productIds array', async () => {
      repo.findIdsByUserId.mockResolvedValue(['p1', 'p2']);
      const result = await service.getWishlistIds('u1');
      expect(result).toEqual({ productIds: ['p1', 'p2'] });
    });
  });

  describe('add', () => {
    it('creates item when not already wishlisted', async () => {
      repo.exists.mockResolvedValue(false);
      repo.create.mockResolvedValue({ id: 'w1', userId: 'u1', productId: 'p1', createdAt: new Date() });
      await service.add('u1', 'p1');
      expect(repo.create).toHaveBeenCalledWith('u1', 'p1');
    });

    it('throws ConflictException when already wishlisted', async () => {
      repo.exists.mockResolvedValue(true);
      await expect(service.add('u1', 'p1')).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes item when in wishlist', async () => {
      repo.exists.mockResolvedValue(true);
      repo.delete.mockResolvedValue({ id: 'w1', userId: 'u1', productId: 'p1', createdAt: new Date() });
      await service.remove('u1', 'p1');
      expect(repo.delete).toHaveBeenCalledWith('u1', 'p1');
    });

    it('throws NotFoundException when not in wishlist', async () => {
      repo.exists.mockResolvedValue(false);
      await expect(service.remove('u1', 'p1')).rejects.toThrow(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});

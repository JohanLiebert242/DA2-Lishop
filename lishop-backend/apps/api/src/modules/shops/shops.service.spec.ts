import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopsService } from './shops.service';
import { ShopsRepository } from './shops.repository';

jest.mock('@lishop/database', () => ({
  prisma: {
    user: { update: jest.fn() },
  },
  UserRole: {
    CUSTOMER: 'CUSTOMER',
    ADMIN: 'ADMIN',
    SELLER: 'SELLER',
  },
  ShopStatus: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
  },
}));

import { prisma, ShopStatus, UserRole } from '@lishop/database';

const mockShop = {
  id: 'shop-1',
  name: 'Shop thời trang XYZ',
  slug: 'shop-thoi-trang-xyz',
  description: 'Chuyên thời trang nam nữ',
  logoUrl: null,
  bannerUrl: null,
  phone: '0901234567',
  address: 'Hà Nội',
  status: ShopStatus.PENDING,
  userId: 'user-1',
  approvedAt: null,
  approvedById: null,
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: 'user-1',
    email: 'seller@test.com',
    firstName: 'Nguyễn',
    lastName: 'Văn A',
    avatarUrl: null,
  },
  approvedBy: null,
  _count: { products: 0 },
};

const mockApprovedShop = {
  ...mockShop,
  status: ShopStatus.APPROVED,
  approvedAt: new Date(),
  approvedById: 'admin-1',
  approvedBy: { id: 'admin-1', firstName: 'Admin', lastName: 'System' },
};

describe('ShopsService', () => {
  let service: ShopsService;
  const repo = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findBySlug: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const config = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ShopsService,
        { provide: ShopsRepository, useValue: repo },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(ShopsService);
  });

  describe('register', () => {
    const dto = {
      name: 'Shop thời trang XYZ',
      description: 'Chuyên thời trang nam nữ',
      phone: '0901234567',
      address: 'Hà Nội',
    };

    it('creates a new shop with PENDING status and upgrades user role to SELLER', async () => {
      repo.findByUserId.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockShop);
      (prisma.user.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.register('user-1', dto);

      expect(repo.findByUserId).toHaveBeenCalledWith('user-1');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          description: dto.description,
          phone: dto.phone,
          address: dto.address,
          user: { connect: { id: 'user-1' } },
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: UserRole.SELLER },
      });
      expect(result).toEqual(mockShop);
    });

    it('throws ConflictException if user already has a shop', async () => {
      repo.findByUserId.mockResolvedValue(mockShop);

      await expect(service.register('user-1', dto)).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('generates a valid slug from the shop name', async () => {
      repo.findByUserId.mockResolvedValue(null);
      repo.create.mockImplementation(async (data: any) => ({ ...mockShop, slug: data.slug }));
      (prisma.user.update as jest.Mock).mockResolvedValue(undefined);

      await service.register('user-1', { ...dto, name: 'Shop Thời Trang XYZ!' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'shop-thoi-trang-xyz' }),
      );
    });

    it('throws ConflictException on duplicate name (Prisma P2002)', async () => {
      repo.findByUserId.mockResolvedValue(null);
      repo.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.register('user-1', dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getMyShop', () => {
    it('returns the shop for the user', async () => {
      repo.findByUserId.mockResolvedValue(mockShop);

      const result = await service.getMyShop('user-1');

      expect(result).toEqual(mockShop);
    });

    it('throws NotFoundException if user has no shop', async () => {
      repo.findByUserId.mockResolvedValue(null);

      await expect(service.getMyShop('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getShopBySlug', () => {
    it('returns an APPROVED shop by slug', async () => {
      repo.findBySlug.mockResolvedValue(mockApprovedShop);

      const result = await service.getShopBySlug('shop-thoi-trang-xyz');

      expect(result).toEqual(mockApprovedShop);
    });

    it('throws NotFoundException if shop is PENDING', async () => {
      repo.findBySlug.mockResolvedValue(mockShop);

      await expect(service.getShopBySlug('shop-thoi-trang-xyz')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if shop is REJECTED', async () => {
      repo.findBySlug.mockResolvedValue({ ...mockShop, status: ShopStatus.REJECTED });

      await expect(service.getShopBySlug('shop-thoi-trang-xyz')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if shop does not exist', async () => {
      repo.findBySlug.mockResolvedValue(null);

      await expect(service.getShopBySlug('not-exists')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateShop', () => {
    it('updates the shop for the current user', async () => {
      repo.findByUserId.mockResolvedValue(mockShop);
      repo.update.mockResolvedValue({ ...mockShop, description: 'Mô tả mới' });

      const result = await service.updateShop('user-1', { description: 'Mô tả mới' });

      expect(repo.update).toHaveBeenCalledWith('shop-1', { description: 'Mô tả mới' });
      expect(result.description).toBe('Mô tả mới');
    });

    it('throws NotFoundException if user has no shop', async () => {
      repo.findByUserId.mockResolvedValue(null);

      await expect(service.updateShop('user-1', { name: 'Tên mới' })).rejects.toThrow(NotFoundException);
    });

    it('only updates provided fields', async () => {
      repo.findByUserId.mockResolvedValue(mockShop);
      repo.update.mockResolvedValue(mockShop);

      await service.updateShop('user-1', { phone: '0987654321' });

      expect(repo.update).toHaveBeenCalledWith('shop-1', { phone: '0987654321' });
    });
  });

  describe('findAll', () => {
    it('returns all shops without filter', async () => {
      repo.findAll.mockResolvedValue([mockShop, mockApprovedShop]);

      const result = await service.findAll({});

      expect(repo.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(2);
    });

    it('filters shops by status', async () => {
      repo.findAll.mockResolvedValue([mockShop]);

      const result = await service.findAll({ status: 'PENDING' });

      expect(repo.findAll).toHaveBeenCalledWith('PENDING');
      expect(result).toHaveLength(1);
      expect(result[0]!.status).toBe(ShopStatus.PENDING);
    });
  });

  describe('approveShop', () => {
    it('approves a PENDING shop', async () => {
      repo.findById.mockResolvedValue(mockShop);
      repo.update.mockResolvedValue(mockApprovedShop);

      const result = await service.approveShop('shop-1', 'admin-1');

      expect(repo.update).toHaveBeenCalledWith('shop-1', {
        status: ShopStatus.APPROVED,
        approvedAt: expect.any(String),
        approvedBy: { connect: { id: 'admin-1' } },
      });
      expect(result.status).toBe(ShopStatus.APPROVED);
    });

    it('is idempotent if shop is already approved', async () => {
      repo.findById.mockResolvedValue(mockApprovedShop);

      const result = await service.approveShop('shop-1', 'admin-1');

      expect(repo.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockApprovedShop);
    });

    it('throws NotFoundException if shop does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.approveShop('not-exists', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectShop', () => {
    it('rejects a PENDING shop with a reason', async () => {
      repo.findById.mockResolvedValue(mockShop);
      repo.update.mockResolvedValue({ ...mockShop, status: ShopStatus.REJECTED, rejectionReason: 'Thiếu thông tin' });

      const result = await service.rejectShop('shop-1', 'admin-1', 'Thiếu thông tin');

      expect(repo.update).toHaveBeenCalledWith('shop-1', {
        status: ShopStatus.REJECTED,
        rejectionReason: 'Thiếu thông tin',
        approvedBy: { connect: { id: 'admin-1' } },
      });
      expect(result.status).toBe(ShopStatus.REJECTED);
    });

    it('rejects a PENDING shop without a reason', async () => {
      repo.findById.mockResolvedValue(mockShop);
      repo.update.mockResolvedValue({ ...mockShop, status: ShopStatus.REJECTED, rejectionReason: null });

      await service.rejectShop('shop-1', 'admin-1');

      expect(repo.update).toHaveBeenCalledWith('shop-1', {
        status: ShopStatus.REJECTED,
        rejectionReason: null,
        approvedBy: { connect: { id: 'admin-1' } },
      });
    });

    it('is idempotent if shop is already rejected', async () => {
      const rejected = { ...mockShop, status: ShopStatus.REJECTED };
      repo.findById.mockResolvedValue(rejected);

      const result = await service.rejectShop('shop-1', 'admin-1');

      expect(repo.update).not.toHaveBeenCalled();
      expect(result).toEqual(rejected);
    });

    it('throws NotFoundException if shop does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.rejectShop('not-exists', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });
});

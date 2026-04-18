import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { CategoriesService } from '../categories/categories.service';

const mockProduct = {
  id: 'p1',
  name: 'iPhone 15',
  slug: 'iphone-15',
  description: 'Great phone',
  priceVnd: 20000000,
  priceUsd: 800,
  stock: 10,
  categoryId: 'c1',
  averageRating: 4.5,
  reviewCount: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
  tags: [{ tagId: 't1', tag: { name: 'smartphone' } }],
  category: { id: 'c1', name: 'Electronics', slug: 'electronics' },
};

describe('ProductsService', () => {
  let service: ProductsService;
  const repo = {
    findMany: jest.fn(),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFeatured: jest.fn(),
    findRelated: jest.fn(),
  };
  const categoriesService = { findBySlug: jest.fn(), create: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: repo },
        { provide: CategoriesService, useValue: categoriesService },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('findMany returns items and nextCursor', async () => {
    repo.findMany.mockResolvedValue({ items: [mockProduct], nextCursor: null });
    const result = await service.findMany({ limit: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it('findBySlug throws NotFoundException when missing', async () => {
    repo.findBySlug.mockResolvedValue(null);
    await expect(service.findBySlug('missing')).rejects.toThrow(NotFoundException);
  });

  it('findBySlug returns product', async () => {
    repo.findBySlug.mockResolvedValue(mockProduct);
    const result = await service.findBySlug('iphone-15');
    expect(result.slug).toBe('iphone-15');
  });

  it('create generates slug from name', async () => {
    repo.create.mockResolvedValue({ ...mockProduct, slug: 'samsung-s24' });
    const result = await service.create({
      name: 'Samsung S24',
      description: 'Great phone',
      priceVnd: 15000000,
      priceUsd: 600,
      stock: 5,
      categoryId: 'c1',
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'samsung-s24' }));
    expect(result).toBeDefined();
  });

  it('delete throws NotFoundException if product missing', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.delete('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('findRelated returns products ranked by tag overlap', async () => {
    repo.findBySlug.mockResolvedValue(mockProduct);
    const related = [{ ...mockProduct, id: 'p2', name: 'Samsung S24', slug: 'samsung-s24' }];
    repo.findRelated.mockResolvedValue(related);
    const result = await service.findRelated('iphone-15');
    expect(repo.findRelated).toHaveBeenCalledWith('p1', 'c1', ['t1'], 6);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Samsung S24');
  });

  it('findRelated throws NotFoundException for unknown slug', async () => {
    repo.findBySlug.mockResolvedValue(null);
    await expect(service.findRelated('unknown')).rejects.toThrow(NotFoundException);
    expect(repo.findRelated).not.toHaveBeenCalled();
  });
});

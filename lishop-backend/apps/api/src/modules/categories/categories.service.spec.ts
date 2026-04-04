import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';

const mockCats = [
  { id: 'c1', name: 'Electronics', slug: 'electronics', imageUrl: null, parentId: null },
  { id: 'c2', name: 'Phones', slug: 'phones', imageUrl: null, parentId: 'c1' },
  { id: 'c3', name: 'Fashion', slug: 'fashion', imageUrl: null, parentId: null },
];

describe('CategoriesService', () => {
  let service: CategoriesService;
  const repo = {
    findAll: jest.fn(),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CategoriesService, { provide: CategoriesRepository, useValue: repo }],
    }).compile();
    service = module.get(CategoriesService);
  });

  afterEach(() => jest.resetAllMocks());

  it('findTree builds nested structure', async () => {
    repo.findAll.mockResolvedValue(mockCats);
    const tree = await service.findTree();
    expect(tree).toHaveLength(2); // Electronics + Fashion at root
    const electronics = tree.find((c) => c.slug === 'electronics')!;
    const children = electronics.children ?? [];
    expect(children).toHaveLength(1); // Phones under Electronics
    expect(children[0]!.slug).toBe('phones');
  });

  it('findBySlug throws NotFoundException when missing', async () => {
    repo.findBySlug.mockResolvedValue(null);
    await expect(service.findBySlug('missing')).rejects.toThrow(NotFoundException);
  });

  it('create generates slug from name', async () => {
    const newCat = { id: 'c4', name: 'Sách vở', slug: 'sach-vo', imageUrl: null, parentId: null };
    repo.create.mockResolvedValue(newCat);
    const result = await service.create({ name: 'Sách vở' });
    expect(result.slug).toBe('sach-vo');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'sach-vo' }));
  });
});

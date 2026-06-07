jest.mock('@lishop/database', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
    },
  },
  Prisma: {
    QueryMode: {
      insensitive: 'insensitive',
    },
  },
}));

import { prisma } from '@lishop/database';
import { ProductsRepository } from './products.repository';

describe('ProductsRepository', () => {
  const repo = new ProductsRepository();

  beforeEach(() => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('filters a selected rating as an exact star bucket instead of a minimum threshold', async () => {
    await repo.findMany({ minRating: 1, limit: 20 });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          averageRating: { gte: 1, lt: 1.5 },
        }),
      }),
    );
  });

  it('keeps five-star filter open-ended at the top bucket', async () => {
    await repo.findMany({ minRating: 5, limit: 20 });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          averageRating: { gte: 4.5, lte: 5 },
        }),
      }),
    );
  });

  it('applies sale, free shipping, and in-stock filters together', async () => {
    await repo.findMany({
      onSale: true,
      freeShipping: true,
      inStock: true,
      limit: 20,
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          stock: { gt: 0 },
          priceVnd: { gte: 500_000 },
          tags: {
            some: {
              tag: {
                name: {
                  equals: 'sale',
                  mode: 'insensitive',
                },
              },
            },
          },
        }),
      }),
    );
  });
});

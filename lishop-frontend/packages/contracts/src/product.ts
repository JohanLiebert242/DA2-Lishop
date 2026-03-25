import { z } from 'zod';

export const ProductImageSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  alt: z.string().nullable(),
  isPrimary: z.boolean(),
});

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  priceVnd: z.number().int().nonnegative(),
  priceUsd: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  categoryId: z.string().uuid(),
  images: z.array(ProductImageSchema),
  tags: z.array(z.string()),
  averageRating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  averageRating: true,
  reviewCount: true,
  createdAt: true,
});

export const ProductListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().uuid().optional(),
  minPriceVnd: z.coerce.number().int().optional(),
  maxPriceVnd: z.coerce.number().int().optional(),
  minRating: z.coerce.number().optional(),
  tags: z.array(z.string()).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'rating_desc', 'newest']).optional(),
  q: z.string().optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;

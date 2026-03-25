import { z } from 'zod';
import { ReviewStatus } from './common';

export const ReviewSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  userId: z.string().uuid(),
  userFullName: z.string(),
  rating: z.number().int().min(1).max(5),
  content: z.string().max(2000),
  status: z.nativeEnum(ReviewStatus),
  verifiedPurchase: z.boolean(),
  createdAt: z.string().datetime(),
});

export const CreateReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(10).max(2000),
});

export type Review = z.infer<typeof ReviewSchema>;
export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;

import { z } from 'zod';

export const CouponSchema = z.object({
  id: z.string().uuid(),
  code: z.string().toUpperCase(),
  type: z.enum(['PERCENT', 'FIXED', 'FREE_SHIPPING']),
  value: z.number().int().nonnegative(),
  minOrderVnd: z.number().int().nonnegative(),
  maxUses: z.number().int().nullable(),
  usedCount: z.number().int(),
  expiresAt: z.string().datetime().nullable(),
});

export const ApplyCouponSchema = z.object({
  code: z.string().min(1),
});

export const FlashSaleSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  discountPercent: z.number().int().min(1).max(99),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export type Coupon = z.infer<typeof CouponSchema>;
export type FlashSale = z.infer<typeof FlashSaleSchema>;
export type ApplyCouponDto = z.infer<typeof ApplyCouponSchema>;

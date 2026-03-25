import { z } from 'zod';

export const CartItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  productSlug: z.string(),
  imageUrl: z.string().url().nullable(),
  quantity: z.number().int().positive(),
  priceVnd: z.number().int().nonnegative(),
  priceUsd: z.number().int().nonnegative(),
});

export const CartSchema = z.object({
  items: z.array(CartItemSchema),
  subtotalVnd: z.number().int().nonnegative(),
  subtotalUsd: z.number().int().nonnegative(),
  couponCode: z.string().nullable(),
  discountVnd: z.number().int().nonnegative(),
  totalVnd: z.number().int().nonnegative(),
});

export const AddToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export type CartItem = z.infer<typeof CartItemSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type AddToCartDto = z.infer<typeof AddToCartSchema>;

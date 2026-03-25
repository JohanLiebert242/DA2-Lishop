import { z } from 'zod';
import { OrderStatus, PaymentMethod } from './common';
import { AddressSchema } from './user';

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPriceVnd: z.number().int().nonnegative(),
  totalPriceVnd: z.number().int().nonnegative(),
});

export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  status: z.nativeEnum(OrderStatus),
  items: z.array(OrderItemSchema),
  shippingAddress: AddressSchema,
  subtotalVnd: z.number().int().nonnegative(),
  shippingFeeVnd: z.number().int().nonnegative(),
  discountVnd: z.number().int().nonnegative(),
  totalVnd: z.number().int().nonnegative(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  trackingNumber: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;

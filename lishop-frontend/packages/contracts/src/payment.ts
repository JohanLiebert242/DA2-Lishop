import { z } from 'zod';
import { PaymentMethod } from './common';

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  method: z.nativeEnum(PaymentMethod),
  amountVnd: z.number().int().nonnegative(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
  providerRef: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type Payment = z.infer<typeof PaymentSchema>;

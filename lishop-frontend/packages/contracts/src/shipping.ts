import { z } from 'zod';

export const ShippingOptionSchema = z.object({
  provider: z.enum(['GHN', 'GHTK', 'STANDARD']),
  name: z.string(),
  feeVnd: z.number().int().nonnegative(),
  estimatedDays: z.number().int().positive(),
});

export type ShippingOption = z.infer<typeof ShippingOptionSchema>;

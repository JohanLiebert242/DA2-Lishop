import { z } from 'zod';

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['ORDER_STATUS', 'PROMOTION', 'REVIEW', 'SYSTEM', 'SUPPORT', 'RETURN', 'WALLET_TOPUP']),
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  createdAt: z.string().datetime(),
});

export type Notification = z.infer<typeof NotificationSchema>;

import { z } from 'zod';

// ─── Order Status Event ───

export const OrderStatusEventSchema = z.object({
  event: z.literal('order:status'),
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  previousStatus: z.string().optional(),
  status: z.string(),
  timestamp: z.string().datetime(),
});

export type OrderStatusEvent = z.infer<typeof OrderStatusEventSchema>;

// ─── Ticket Message Event ───

export const TicketMessageEventSchema = z.object({
  event: z.literal('ticket:message'),
  ticketId: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    ticketId: z.string().uuid(),
    userId: z.string().uuid(),
    isAdmin: z.boolean(),
    content: z.string(),
    createdAt: z.string().datetime(),
  }),
});

export type TicketMessageEvent = z.infer<typeof TicketMessageEventSchema>;

// ─── Ticket Status Event ───

export const TicketStatusEventSchema = z.object({
  event: z.literal('ticket:status'),
  ticketId: z.string().uuid(),
  status: z.string(),
  timestamp: z.string().datetime(),
});

export type TicketStatusEvent = z.infer<typeof TicketStatusEventSchema>;

// ─── Flash Sale Update Event ───

export const FlashSaleItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  discountPercent: z.number().int().min(1).max(99),
});

export const FlashSaleUpdateEventSchema = z.object({
  event: z.literal('flashsale:update'),
  saleId: z.string().uuid(),
  isActive: z.boolean(),
  items: z.array(FlashSaleItemSchema),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export type FlashSaleUpdateEvent = z.infer<typeof FlashSaleUpdateEventSchema>;

// ─── Inventory Update Event ───

export const InventoryUpdateEventSchema = z.object({
  event: z.literal('inventory:update'),
  productId: z.string().uuid(),
  stock: z.number().int().nonnegative(),
  previousStock: z.number().int().nonnegative(),
  delta: z.number().int(),
  timestamp: z.string().datetime(),
});

export type InventoryUpdateEvent = z.infer<typeof InventoryUpdateEventSchema>;

// ─── Admin Feed Event (discriminated union) ───

export const NewOrderFeedSchema = z.object({
  type: z.literal('new_order'),
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  totalVnd: z.number().int().nonnegative(),
  customerName: z.string(),
  timestamp: z.string().datetime(),
});

export const NewTicketFeedSchema = z.object({
  type: z.literal('new_ticket'),
  ticketId: z.string().uuid(),
  subject: z.string(),
  customerName: z.string(),
  timestamp: z.string().datetime(),
});

export const ReturnRequestFeedSchema = z.object({
  type: z.literal('return_request'),
  returnId: z.string().uuid(),
  orderNumber: z.string(),
  customerName: z.string(),
  timestamp: z.string().datetime(),
});

export const WalletTopupFeedSchema = z.object({
  type: z.literal('wallet_topup'),
  topupId: z.string().uuid(),
  userId: z.string().uuid(),
  amountVnd: z.number().int().nonnegative(),
  customerName: z.string(),
  timestamp: z.string().datetime(),
});

export const AdminFeedEventSchema = z.discriminatedUnion('type', [
  NewOrderFeedSchema,
  NewTicketFeedSchema,
  ReturnRequestFeedSchema,
  WalletTopupFeedSchema,
]);

export type AdminFeedEvent = z.infer<typeof AdminFeedEventSchema>;

// ─── Room Join/Leave Client Events ───

export const RoomJoinSchema = z.object({
  room: z.string().min(1),
});

export const RoomLeaveSchema = z.object({
  room: z.string().min(1),
});

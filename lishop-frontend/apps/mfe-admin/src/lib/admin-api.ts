const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('lishop_at');
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export interface AdminStats {
  orderCount: number;
  revenueVnd: number;
  userCount: number;
  productCount: number;
}

export type OrderStatus =
  | 'PENDING' | 'PROCESSING' | 'SHIPPED'
  | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export interface AdminOrderItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalVnd: number;
  createdAt: string;
  itemCount: number;
  user: { email: string; firstName: string; lastName: string };
}

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  loyaltyPoints: number;
  createdAt: string;
}

export type CouponType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';

export interface AdminCoupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderVnd: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCouponInput {
  code: string;
  type: CouponType;
  value: number;
  minOrderVnd?: number;
  maxUses?: number;
  expiresAt?: string;
}

export interface DailyRevenue {
  date: string;
  amount: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  revenue: number;
}

export interface AdminAnalytics {
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
}

// Inventory types
export interface ProductStock {
  id: string;
  name: string;
  slug: string;
  stock: number;
  weightGrams: number;
  isLowStock: boolean;
  lastMovement: { type: string; delta: number; createdAt: string } | null;
}

export interface StockMovement {
  id: string;
  type: string;
  delta: number;
  balanceAfter: number;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
}

// Returns types
export interface AdminReturn {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  description: string | null;
  adminNote: string | null;
  createdAt: string;
  order: { orderNumber: string; totalVnd: number };
  user: { email: string; firstName: string; lastName: string };
  items: { id: string; orderItemId: string; quantity: number }[];
}

export const adminApi = {
  getStats: () => apiFetch<AdminStats>('/admin/stats'),
  listOrders: () => apiFetch<AdminOrderItem[]>('/admin/orders'),
  updateOrderStatus: (id: string, status: OrderStatus) =>
    apiFetch<AdminOrderItem>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  listUsers: () => apiFetch<AdminUserItem[]>('/admin/users'),
  listCoupons: () => apiFetch<AdminCoupon[]>('/admin/coupons'),
  createCoupon: (data: CreateCouponInput) =>
    apiFetch<AdminCoupon>('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleCoupon: (id: string) =>
    apiFetch<AdminCoupon>(`/admin/coupons/${id}/toggle`, { method: 'PATCH' }),
  getAnalytics: () => apiFetch<AdminAnalytics>('/admin/analytics'),
  getInventory: () => apiFetch<ProductStock[]>('/admin/inventory'),
  adjustStock: (productId: string, delta: number, note?: string) =>
    apiFetch<{ id: string; name: string; stock: number }>(`/admin/inventory/${productId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ delta, note }),
    }),
  getStockMovements: (productId: string) =>
    apiFetch<StockMovement[]>(`/admin/inventory/${productId}/movements`),
  getReturns: () => apiFetch<AdminReturn[]>('/admin/returns'),
  updateReturnStatus: (id: string, status: string, adminNote?: string) =>
    apiFetch<AdminReturn>(`/admin/returns/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminNote }),
    }),

  // Support tickets
  getTickets: (status?: string) =>
    apiFetch<AdminTicket[]>(`/admin/tickets${status ? `?status=${status}` : ''}`),
  updateTicketStatus: (id: string, status: TicketStatus) =>
    apiFetch<AdminTicket>(`/admin/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  addTicketMessage: (id: string, content: string) =>
    apiFetch<{ id: string; content: string; isAdmin: boolean; createdAt: string }>(
      `/admin/tickets/${id}/messages`,
      { method: 'POST', body: JSON.stringify({ content }) },
    ),

  // FAQ
  getAllFaq: () => apiFetch<FAQ[]>('/admin/faq'),
  createFaq: (data: {
    question: string;
    answer: string;
    category: string;
    sortOrder?: number;
    isPublished?: boolean;
  }) => apiFetch<FAQ>('/admin/faq', { method: 'POST', body: JSON.stringify(data) }),
  updateFaq: (id: string, data: Partial<{
    question: string;
    answer: string;
    category: string;
    sortOrder: number;
    isPublished: boolean;
  }>) => apiFetch<FAQ>(`/admin/faq/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFaq: (id: string) =>
    apiFetch<void>(`/admin/faq/${id}`, { method: 'DELETE' }),
};

// ─── Support / FAQ types ──────────────────────────────────────────────────────

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'ORDER' | 'PRODUCT' | 'SHIPPING' | 'PAYMENT' | 'RETURN' | 'OTHER';

export interface AdminTicket {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  orderRef: string | null;
  createdAt: string;
  user: { email: string; firstName: string; lastName: string };
  _count: { messages: number };
  messages: { content: string; createdAt: string; isAdmin: boolean }[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
}

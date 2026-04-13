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
};

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

  // Users
  updateUserRole: (id: string, role: 'ADMIN' | 'CUSTOMER') =>
    apiFetch<AdminUserItem>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  // Payments
  getPayments: () => apiFetch<AdminPayment[]>('/admin/payments'),
  confirmPaymentAdmin: (orderId: string) =>
    apiFetch<AdminPayment>(`/admin/payments/${orderId}/confirm`, { method: 'PATCH' }),

  // Reviews
  getReviews: (status?: string) =>
    apiFetch<AdminReview[]>(`/admin/reviews${status ? `?status=${status}` : ''}`),
  moderateReview: (id: string, status: ReviewStatus) =>
    apiFetch<AdminReview>(`/admin/reviews/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Flash sales
  getFlashSales: () => apiFetch<AdminFlashSale[]>('/admin/flash-sales'),
  createFlashSale: (data: { startAt: string; endAt: string; isActive?: boolean }) =>
    apiFetch<AdminFlashSale>('/admin/flash-sales', { method: 'POST', body: JSON.stringify(data) }),
  updateFlashSale: (id: string, data: { startAt?: string; endAt?: string; isActive?: boolean }) =>
    apiFetch<AdminFlashSale>(`/admin/flash-sales/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFlashSale: (id: string) =>
    apiFetch<void>(`/admin/flash-sales/${id}`, { method: 'DELETE' }),
  addFlashSaleItem: (saleId: string, productId: string, discountPercent: number) =>
    apiFetch<AdminFlashSale>(`/admin/flash-sales/${saleId}/items`, {
      method: 'POST',
      body: JSON.stringify({ productId, discountPercent }),
    }),
  removeFlashSaleItem: (saleId: string, itemId: string) =>
    apiFetch<AdminFlashSale>(`/admin/flash-sales/${saleId}/items/${itemId}`, { method: 'DELETE' }),

  // Products
  listProducts: () =>
    apiFetch<{ items: AdminProduct[]; nextCursor: string | null }>('/products?limit=100'),
  createProduct: (data: CreateProductInput) =>
    apiFetch<AdminProduct>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<CreateProductInput>) =>
    apiFetch<AdminProduct>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    apiFetch<void>(`/products/${id}`, { method: 'DELETE' }),
  listCategories: () =>
    apiFetch<AdminCategory[]>('/categories'),
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

// ─── Products ─────────────────────────────────────────────────────────────────

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  weightGrams: number;
  averageRating: number;
  reviewCount: number;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  images: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
  createdAt: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface CreateProductInput {
  name: string;
  description: string;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  weightGrams?: number;
  categoryId: string;
  images?: { url: string; alt?: string; isPrimary?: boolean }[];
  tags?: string[];
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface AdminPayment {
  id: string;
  orderId: string;
  method: string;
  amountVnd: number;
  status: PaymentStatus;
  providerRef: string | null;
  invoiceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    orderNumber: string;
    userId: string;
    user: { email: string; firstName: string; lastName: string };
  };
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  content: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  createdAt: string;
  product: { name: string; slug: string };
  user: { email: string; firstName: string; lastName: string };
}

// ─── Flash Sales ─────────────────────────────────────────────────────────────

export interface FlashSaleItem {
  id: string;
  discountPercent: number;
  product: {
    id: string;
    name: string;
    slug: string;
    priceVnd: number;
    images: { url: string }[];
  };
}

export interface AdminFlashSale {
  id: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  items: FlashSaleItem[];
}

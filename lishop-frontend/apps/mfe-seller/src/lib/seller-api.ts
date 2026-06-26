import { createApiFetch } from '@lishop/shared';

const apiFetch = createApiFetch(
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000',
  process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001',
);

export interface SellerShop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  phone: string | null;
  address: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  _count: { products: number };
}

export interface SellerProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  weightGrams: number;
  averageRating: number;
  reviewCount: number;
  categoryId: string;
  shopId: string | null;
  createdAt: string;
  category: { id: string; name: string; slug: string };
  images: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
}

export interface CreateSellerProductInput {
  name: string;
  description: string;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  categoryId: string;
  sku?: string;
  weightGrams?: number;
  images?: { url: string; alt?: string; isPrimary?: boolean }[];
  tags?: string[];
}

export interface SellerOrderItem {
  id: string;
  productId: string;
  productName: string;
  variantName: string | null;
  variantSku: string | null;
  quantity: number;
  unitPriceVnd: number;
  totalPriceVnd: number;
  productSlug: string | null;
}

export interface SellerOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalVnd: number;
  createdAt: string;
  items: SellerOrderItem[];
  user: { email: string; firstName: string; lastName: string };
  payment: { method: string; amountVnd: number; status: string } | null;
  address: { fullName: string; phone: string; city: string };
}

export interface SellerOrderDetail extends SellerOrder {}

export interface SellerWallet {
  id: string;
  userId: string;
  balanceVnd: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: string;
  amountVnd: number;
  balanceAfter: number;
  description: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface SellerInvoice {
  id: string;
  orderId: string;
  invoiceNo: string;
  billingName: string;
  billingEmail: string;
  billingAddress: string;
  billingPhone: string;
  subtotalVnd: number;
  discountVnd: number;
  shippingFeeVnd: number;
  vatPercent: number;
  vatVnd: number;
  totalVnd: number;
  issuedAt: string;
  order?: { orderNumber: string };
}

export interface SellerReturn {
  id: string;
  orderId: string;
  userId: string;
  status: string;
  reason: string;
  description: string | null;
  adminNote: string | null;
  createdAt: string;
  order?: { orderNumber: string; totalVnd: number };
  user?: { email: string; firstName: string; lastName: string };
  items?: { id: string; orderItemId: string; quantity: number }[];
}

export interface SellerRefund {
  id: string;
  orderId: string;
  userId: string;
  amountVnd: number;
  method: string;
  status: string;
  reason: string | null;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
  order?: { orderNumber: string };
}

export interface SellerReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  content: string;
  status: string;
  verifiedPurchase: boolean;
  createdAt: string;
  product: { name: string; slug: string };
  user: { email: string; firstName: string; lastName: string };
}

export interface SellerCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export const sellerApi = {
  // Shop
  getMyShop: () => apiFetch<SellerShop>('/shops/me'),
  updateShop: (data: Partial<{ name: string; description: string; phone: string; address: string; logoUrl: string; bannerUrl: string }>) =>
    apiFetch<SellerShop>('/shops/me', { method: 'PATCH', body: JSON.stringify(data) }),

  // Products
  getMyProducts: (params?: { limit?: number; cursor?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.cursor) search.set('cursor', params.cursor);
    const qs = search.toString();
    return apiFetch<{ items: SellerProduct[]; nextCursor: string | null }>(`/seller/products${qs ? `?${qs}` : ''}`);
  },
  createProduct: (data: CreateSellerProductInput) =>
    apiFetch<SellerProduct>('/seller/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<CreateSellerProductInput>) =>
    apiFetch<SellerProduct>(`/seller/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    apiFetch<void>(`/seller/products/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: () => apiFetch<SellerOrder[]>('/seller/orders'),
  getOrderDetail: (id: string) => apiFetch<SellerOrderDetail>(`/seller/orders/${id}`),

  // Shop Chat (seller)
  getConversations: () =>
    apiFetch<Array<{ userId: string; customerName: string; avatarUrl: string | null; lastMessage: string; lastMessageAt: string }>>('/seller/chat/conversations'),

  getSellerChatShop: () =>
    apiFetch<{ id: string; name: string; slug: string }>('/seller/chat/shop'),

  getConversationMessages: (customerUserId: string) =>
    apiFetch<Array<{ id: string; shopId: string; userId: string; content: string; isFromShop: boolean; createdAt: string }>>(`/seller/chat/conversations/${customerUserId}`),

  sendConversationReply: (customerUserId: string, content: string) =>
    apiFetch<{ id: string; shopId: string; userId: string; content: string; isFromShop: boolean; createdAt: string }>(`/seller/chat/conversations/${customerUserId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Wallet
  getMyWallet: () => apiFetch<SellerWallet>('/wallet'),
  getWalletTransactions: (params?: { limit?: number; cursor?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.cursor) search.set('cursor', params.cursor);
    const qs = search.toString();
    return apiFetch<{ items: WalletTransaction[]; nextCursor: string | null }>(`/wallet/transactions${qs ? `?${qs}` : ''}`);
  },

  // Invoices
  getMyInvoices: () => apiFetch<SellerInvoice[]>('/invoices'),

  // Returns
  getMyReturns: () => apiFetch<SellerReturn[]>('/returns'),

  // Refunds
  getMyRefunds: () => apiFetch<SellerRefund[]>('/refunds'),

  // Reviews
  getMyReviews: (params?: { status?: string }) => {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    const qs = search.toString();
    return apiFetch<SellerReview[]>(`/seller/reviews${qs ? `?${qs}` : ''}`);
  },

  // Categories
  getCategories: () => apiFetch<SellerCategory[]>('/categories'),
};

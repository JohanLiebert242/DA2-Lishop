const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('lishop_at');
}

async function apiFetch<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export interface OrderItemInfo {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceVnd: number;
  totalPriceVnd: number;
}

export interface OrderAddressInfo {
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  country: string;
}

export interface OrderPaymentInfo {
  id: string;
  method: string;
  amountVnd: number;
  status: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotalVnd: number;
  shippingFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  notes: string | null;
  trackingNumber: string | null;
  createdAt: string;
  items: OrderItemInfo[];
  address: OrderAddressInfo;
  payment: OrderPaymentInfo | null;
}

export const ordersApi = {
  getOrders: () => apiFetch<OrderSummary[]>('/orders'),
  getOrder: (id: string) => apiFetch<OrderSummary>(`/orders/${id}`),
};

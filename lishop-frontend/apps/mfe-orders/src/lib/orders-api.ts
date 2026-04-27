const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
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

// Shipment tracking types
export interface ShipmentEvent {
  id: string;
  status: string;
  location: string | null;
  description: string;
  createdAt: string;
}

export interface ShipmentInfo {
  id: string;
  provider: string;
  trackingNumber: string | null;
  estimatedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  events: ShipmentEvent[];
}

export interface TrackingResponse {
  shipment: ShipmentInfo | null;
}

// Return request types
export type ReturnReason = 'DAMAGED' | 'WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'CHANGED_MIND' | 'OTHER';
export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'COMPLETED';

export interface CreateReturnInput {
  orderId: string;
  reason: ReturnReason;
  description?: string;
  items: { orderItemId: string; quantity: number }[];
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  description: string | null;
  adminNote: string | null;
  createdAt: string;
  items: { id: string; orderItemId: string; quantity: number }[];
}

export interface InvoiceData {
  id: string;
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
}

export interface RefundData {
  id: string;
  orderId: string;
  amountVnd: number;
  method: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  reason: string | null;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
}

export const ordersApi = {
  getOrders: () => apiFetch<OrderSummary[]>('/orders'),
  getOrder: (id: string) => apiFetch<OrderSummary>(`/orders/${id}`),
  cancelOrder: (id: string) =>
    apiFetch<OrderSummary>(`/orders/${id}/cancel`, { method: 'PATCH' }),
  initiatePayment: (orderId: string) =>
    apiFetch<{ paymentUrl: string | null; status: string }>(`/payments/${orderId}/initiate`, {
      method: 'POST',
    }),
  getInvoice: (orderId: string) =>
    apiFetch<InvoiceData>(`/invoices/${orderId}`),
  getRefunds: () =>
    apiFetch<RefundData[]>('/refunds'),
};

export async function getTracking(orderId: string): Promise<TrackingResponse> {
  return apiFetch<TrackingResponse>(`/orders/${orderId}/tracking`);
}

export async function createReturn(input: CreateReturnInput): Promise<ReturnRequest> {
  return apiFetch<ReturnRequest>('/returns', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getMyReturn(orderId: string): Promise<ReturnRequest | null> {
  const returns = await apiFetch<ReturnRequest[]>('/returns');
  return returns.find((r) => r.orderId === orderId) ?? null;
}

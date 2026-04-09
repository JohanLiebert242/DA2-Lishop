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

export interface CartItemInfo {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  quantity: number;
  priceVnd: number;
  stock: number;
}

export interface CartInfo {
  items: CartItemInfo[];
  subtotalVnd: number;
  discountVnd: number;
  totalVnd: number;
  couponCode: string | null;
}

export interface AddressInfo {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  country: string;
  isDefault: boolean;
}

export interface CreateAddressInput {
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  country?: string;
}

export interface OrderResult {
  id: string;
  orderNumber: string;
  status: string;
  subtotalVnd: number;
  shippingFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  createdAt: string;
}

export const checkoutApi = {
  getCart: () => apiFetch<CartInfo>('/cart'),

  getAddresses: () => apiFetch<AddressInfo[]>('/addresses'),

  createAddress: (data: CreateAddressInput) =>
    apiFetch<AddressInfo>('/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  placeOrder: (addressId: string, paymentMethod = 'COD', notes?: string) =>
    apiFetch<OrderResult>('/orders', {
      method: 'POST',
      body: JSON.stringify({ addressId, paymentMethod, notes }),
    }),
};

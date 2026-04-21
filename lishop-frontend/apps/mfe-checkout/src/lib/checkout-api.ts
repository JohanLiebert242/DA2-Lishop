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

export interface CartItem {
  id?: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  quantity: number;
  priceVnd: number;
  stock: number;
  weightGrams?: number;
}

export interface CartDto {
  items: CartItem[];
  subtotalVnd: number;
  couponCode: string | null;
  discountVnd: number;
  totalVnd: number;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  country: string;
  isDefault: boolean;
}

export interface ShippingOption {
  provider: 'GHN' | 'GHTK' | 'VIETTEL_POST';
  name: string;
  feeVnd: number;
  estimatedDays: string;
}

export interface PlaceOrderInput {
  addressId: string;
  paymentMethod: string;
  shippingProvider: string;
  notes?: string;
}

export interface PlaceOrderResult {
  id: string;
  orderNumber: string;
}

// Legacy types for backwards compatibility
export type CartItemInfo = CartItem;
export type CartInfo = CartDto;
export type AddressInfo = Address;
export interface CreateAddressInput {
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  country?: string;
}

export async function getCart(): Promise<CartDto> {
  return apiFetch<CartDto>('/cart');
}

export async function getAddresses(): Promise<Address[]> {
  return apiFetch<Address[]>('/addresses');
}

export async function createAddress(data: CreateAddressInput): Promise<Address> {
  return apiFetch<Address>('/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getShippingRates(cityName: string, weightGrams: number): Promise<ShippingOption[]> {
  const params = new URLSearchParams({ cityName, weightGrams: String(weightGrams) });
  return apiFetch<ShippingOption[]>(`/shipping/rates?${params.toString()}`);
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  return apiFetch<PlaceOrderResult>('/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Legacy checkoutApi object for backwards compatibility
export const checkoutApi = {
  getCart,
  getAddresses,
  createAddress,
  placeOrder: (addressId: string, paymentMethod = 'COD', notes?: string) =>
    placeOrder({ addressId, paymentMethod, shippingProvider: 'GHN', notes }),
};

export { getToken };

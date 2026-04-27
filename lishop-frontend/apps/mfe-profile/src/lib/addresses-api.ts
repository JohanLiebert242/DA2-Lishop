const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
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

export interface CreateAddressInput {
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  country?: string;
}

export const addressesApi = {
  getAll: () => apiFetch<Address[]>('/addresses'),
  create: (data: CreateAddressInput) =>
    apiFetch<Address>('/addresses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateAddressInput>) =>
    apiFetch<Address>(`/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/addresses/${id}`, { method: 'DELETE' }),
  setDefault: (id: string) =>
    apiFetch<Address>(`/addresses/${id}/default`, { method: 'PATCH' }),
};

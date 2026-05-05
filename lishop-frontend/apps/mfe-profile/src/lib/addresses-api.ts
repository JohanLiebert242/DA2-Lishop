const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) },
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

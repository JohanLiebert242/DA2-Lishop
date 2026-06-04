import { createApiFetch } from '@lishop/shared';

const apiFetch = createApiFetch(
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000',
  process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001',
);

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

export interface CreateAddressInput {
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  country?: string;
  latitude?: number;
  longitude?: number;
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

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

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  loyaltyPoints: number;
  role: string;
  createdAt: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface LoyaltyPointItem {
  id: string;
  points: number;
  description: string;
  createdAt: string;
}

export const profileApi = {
  getProfile: () => apiFetch<UserProfile>('/users/profile'),
  updateProfile: (data: UpdateProfileInput) =>
    apiFetch<UserProfile>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getLoyaltyHistory: () => apiFetch<LoyaltyPointItem[]>('/users/loyalty-history'),
};

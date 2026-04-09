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

export const profileApi = {
  getProfile: () => apiFetch<UserProfile>('/users/profile'),
  updateProfile: (data: UpdateProfileInput) =>
    apiFetch<UserProfile>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

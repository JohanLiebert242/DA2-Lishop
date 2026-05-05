import { createApiFetch } from '@lishop/shared';

const apiFetch = createApiFetch(
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000',
  process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001',
);

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

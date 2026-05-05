import { createApiFetch } from '@lishop/shared';

const apiFetch = createApiFetch(
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000',
  process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001',
);

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  relatedId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  eventType: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

export interface UpsertPreferenceInput {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
}

export const EVENT_LABELS: Record<string, string> = {
  ORDER_STATUS: 'Trạng thái đơn hàng',
  PROMOTIONS: 'Khuyến mãi',
  NEW_PRODUCTS: 'Sản phẩm mới',
  REVIEWS: 'Phản hồi đánh giá',
};

export const notificationsApi = {
  listFeed: (page = 1) =>
    apiFetch<NotificationItem[]>(`/notifications?page=${page}&limit=20`),
  markAsRead: (id: string) =>
    apiFetch<NotificationItem>(`/notifications/${id}/read`, { method: 'PATCH' }),
  getPreferences: () =>
    apiFetch<NotificationPreference[]>('/notifications/preferences'),
  upsertPreference: (eventType: string, data: UpsertPreferenceInput) =>
    apiFetch<NotificationPreference>(`/notifications/preferences/${eventType}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

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

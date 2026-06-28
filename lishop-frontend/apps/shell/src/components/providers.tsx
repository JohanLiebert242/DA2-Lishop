'use client';

import { useCallback, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from '@lishop/ui';
import { eventBus, LishopEvent } from '@lishop/event-bus';
import { useNotificationStream, useRealtime } from '@lishop/shared';
import type { StreamNotification } from '@lishop/shared';
import { queryClient } from '../lib/query-client';
import { useAuthStore } from '../stores/auth.store';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function AuthInitializer() {
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    // lishop_at is httpOnly — the browser sends it automatically via credentials: 'include'
    fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('invalid');
        const json = await res.json();
        setAuth(json.data ?? json, null);
      })
      .catch(async () => {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) { clearAuth(); return; }
        const json = await res.json();
        const newToken: string = json.data?.accessToken ?? json.accessToken;
        const meRes = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        if (!meRes.ok) { clearAuth(); return; }
        const meJson = await meRes.json();
        setAuth(meJson.data ?? meJson, newToken);
      });
  }, [setAuth, clearAuth]);

  useEffect(() => {
    const handler = (payload: {
      userId: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string | null;
    }) => {
      const current = useAuthStore.getState().user;
      if (!current || current.id !== payload.userId) return;
      setAuth(
        {
          ...current,
          ...(payload.firstName !== undefined && { firstName: payload.firstName }),
          ...(payload.lastName !== undefined && { lastName: payload.lastName }),
          ...(payload.avatarUrl !== undefined && { avatarUrl: payload.avatarUrl }),
        },
        useAuthStore.getState().accessToken,
      );
    };

    eventBus.on(LishopEvent.PROFILE_UPDATED, handler);
    return () => eventBus.off(LishopEvent.PROFILE_UPDATED, handler);
  }, [setAuth]);

  return null;
}

function updateUnreadCount() {
  const current = parseInt(window.localStorage.getItem('lishop_notification_count') ?? '0', 10);
  const next = current + 1;
  window.localStorage.setItem('lishop_notification_count', next.toString());
  eventBus.emit(LishopEvent.NOTIFICATION_COUNT_UPDATED, { count: next });
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'lishop_notification_count',
    newValue: next.toString(),
  }));
}

function NotificationStream() {
  const isAuthenticated = useAuthStore((s) => s.user != null);

  const handleNotification = (notification: StreamNotification) => {
    toast(notification.title, {
      description: notification.body,
      duration: 5000,
    });
    updateUnreadCount();
  };

  useNotificationStream({
    enabled: isAuthenticated,
    onNotification: handleNotification,
  });

  return null;
}

/** Lắng nghe sự kiện order:status real-time và invalidate query tương ứng */
function OrderStatusListener() {
  const isAuthenticated = useAuthStore((s) => s.user != null);

  const handleOrderStatus = useCallback((data: unknown) => {
    const payload = data as { orderId: string; orderNumber: string; status: string };
    if (!payload?.orderId) return;
    queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    queryClient.invalidateQueries({ queryKey: ['order', payload.orderId] });
    queryClient.invalidateQueries({ queryKey: ['tracking', payload.orderId] });
    queryClient.invalidateQueries({ queryKey: ['my-return', payload.orderId] });
    toast(`Đơn hàng #${payload.orderNumber} đã được cập nhật`, {
      description: `Trạng thái: ${payload.status}`,
      duration: 5000,
    });
  }, []);

  useRealtime({
    enabled: isAuthenticated,
    rooms: [],
    on: {
      'order:status': handleOrderStatus,
    },
  });

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <NotificationStream />
      <OrderStatusListener />
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

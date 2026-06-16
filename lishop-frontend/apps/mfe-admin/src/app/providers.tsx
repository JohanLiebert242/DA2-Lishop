'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster, toast } from '@lishop/ui';
import { useAuthSync, useNotificationStream } from '@lishop/shared';
import type { StreamNotification } from '@lishop/shared';
import { eventBus, LishopEvent } from '@lishop/event-bus';

const LOGIN_URL = `${process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001'}/login`;

function AuthSync() {
  useAuthSync(LOGIN_URL);
  return null;
}

function AdminNotificationStream() {
  const queryClient = useQueryClient();

  const handleNotification = (notification: StreamNotification) => {
    toast(notification.title, {
      description: notification.body,
      duration: 5000,
    });

    const current = parseInt(window.localStorage.getItem('lishop_notification_count') ?? '0', 10);
    const next = current + 1;
    window.localStorage.setItem('lishop_notification_count', next.toString());
    eventBus.emit(LishopEvent.NOTIFICATION_COUNT_UPDATED, { count: next });
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'lishop_notification_count',
      newValue: next.toString(),
    }));

    switch (notification.type) {
      case 'SUPPORT':
        queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
        break;
      case 'RETURN':
        queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
        break;
      case 'WALLET_TOPUP':
        queryClient.invalidateQueries({ queryKey: ['admin-wallet-topups'] });
        break;
      case 'ORDER_STATUS':
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        break;
    }
  };

  useNotificationStream({
    enabled: true,
    onNotification: handleNotification,
  });

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthSync />
      <AdminNotificationStream />
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

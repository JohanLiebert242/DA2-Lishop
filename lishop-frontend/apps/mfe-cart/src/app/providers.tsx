'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { Toaster, toast } from '@lishop/ui';
import { useAuthSync, NotificationStream, hasSessionCookie } from '@lishop/shared';
import type { StreamNotification } from '@lishop/shared';

const LOGIN_URL = `${process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001'}/login`;

function AuthSync() {
  useAuthSync(LOGIN_URL, { requireAuth: true });
  return null;
}

function NotificationListener() {
  const handleNotification = useCallback((notification: StreamNotification) => {
    toast(notification.title, {
      description: notification.body,
      duration: 5000,
    });
  }, []);

  return (
    <NotificationStream
      enabled={hasSessionCookie()}
      onNotification={handleNotification}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthSync />
      <NotificationListener />
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

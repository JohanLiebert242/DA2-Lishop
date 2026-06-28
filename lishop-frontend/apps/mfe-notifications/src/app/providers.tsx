'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from '@lishop/ui';
import { useAuthSync } from '@lishop/shared';

const LOGIN_URL = `${process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001'}/login`;

function AuthSync() {
  useAuthSync(LOGIN_URL, { requireAuth: true });
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthSync />
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

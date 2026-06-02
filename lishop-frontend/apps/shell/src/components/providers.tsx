'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@lishop/ui';
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

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

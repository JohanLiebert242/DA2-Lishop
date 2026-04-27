'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { useAuthStore } from '../stores/auth.store';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function AuthInitializer() {
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const token = getTokenFromCookie();
    if (!token) return;

    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('invalid');
        const json = await res.json();
        setAuth(json.data ?? json, token);
      })
      .catch(async () => {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          clearAuth();
          document.cookie = 'lishop_at=; path=/; SameSite=Lax; max-age=0';
          return;
        }
        const json = await res.json();
        const newToken: string = json.data?.accessToken ?? json.accessToken;
        document.cookie = `lishop_at=${encodeURIComponent(newToken)}; path=/; SameSite=Lax`;

        const meRes = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
        if (!meRes.ok) {
          clearAuth();
          document.cookie = 'lishop_at=; path=/; SameSite=Lax; max-age=0';
          return;
        }
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
    </QueryClientProvider>
  );
}

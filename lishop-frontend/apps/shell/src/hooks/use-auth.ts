'use client';

import { useCallback } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { eventBus, LishopEvent } from '@lishop/event-bus';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export function useAuth() {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).message ?? 'Login failed');
    const data = await res.json();
    const token: string = data.data?.accessToken ?? data.accessToken;

    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    const userProfile = meData.data ?? meData;

    document.cookie = `lishop_at=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
    setAuth(userProfile, token);
    eventBus.emit(LishopEvent.AUTH_LOGIN, { userId: userProfile.id, role: userProfile.role });
  }, [setAuth]);

  const logout = useCallback(async () => {
    if (accessToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
    document.cookie = 'lishop_at=; path=/; SameSite=Lax; max-age=0';
    clearAuth();
    eventBus.emit(LishopEvent.AUTH_LOGOUT, undefined);
  }, [accessToken, clearAuth]);

  const refresh = useCallback(async (): Promise<string | null> => {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) { clearAuth(); return null; }
    const data = await res.json();
    const token: string = data.data?.accessToken ?? data.accessToken;
    if (user) setAuth(user, token);
    return token;
  }, [user, setAuth, clearAuth]);

  return { user, accessToken, isAuthenticated: !!user, login, logout, refresh };
}

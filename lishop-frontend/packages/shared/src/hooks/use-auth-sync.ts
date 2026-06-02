'use client';

import { useEffect } from 'react';
import { hasSessionCookie } from '../api/fetch';

interface AuthSyncOptions {
  requireAuth?: boolean;
}

export function useAuthSync(loginUrl: string, options: AuthSyncOptions = {}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (options.requireAuth && !hasSessionCookie()) {
      window.location.replace(loginUrl);
      return;
    }

    const ch = new BroadcastChannel('lishop-events');
    ch.onmessage = ({ data }: MessageEvent<{ event?: string }>) => {
      if (data?.event === 'AUTH_LOGOUT') {
        window.location.href = loginUrl;
      }
    };
    return () => ch.close();
  }, [loginUrl, options.requireAuth]);
}

'use client';

import { useEffect } from 'react';

export function useAuthSync(loginUrl: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ch = new BroadcastChannel('lishop-events');
    ch.onmessage = ({ data }: MessageEvent<{ event?: string }>) => {
      if (data?.event === 'AUTH_LOGOUT') {
        window.location.href = loginUrl;
      }
    };
    return () => ch.close();
  }, [loginUrl]);
}

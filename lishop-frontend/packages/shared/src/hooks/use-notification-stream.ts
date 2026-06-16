'use client';

import { useEffect, useRef, useState } from 'react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export interface StreamNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  relatedId: string | null;
  isRead: boolean;
  createdAt: string;
}

export type StreamState = 'connecting' | 'live' | 'fallback' | 'idle';

interface UseNotificationStreamOptions {
  enabled?: boolean;
  onNotification?: (notification: StreamNotification) => void;
  onStateChange?: (state: StreamState) => void;
}

export function useNotificationStream(options: UseNotificationStreamOptions = {}): { state: StreamState } {
  const { enabled = true, onNotification, onStateChange } = options;
  const [state, setState] = useState<StreamState>('idle');
  const onNotificationRef = useRef(onNotification);
  const onStateChangeRef = useRef(onStateChange);
  onNotificationRef.current = onNotification;
  onStateChangeRef.current = onStateChange;

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      onStateChangeRef.current?.('idle');
      return;
    }

    if (typeof navigator !== 'undefined' && (navigator as unknown as { webdriver?: boolean }).webdriver) {
      setState('fallback');
      onStateChangeRef.current?.('fallback');
      return;
    }

    setState('connecting');
    onStateChangeRef.current?.('connecting');

    const stream = new EventSource(`${API_URL}/notifications/stream`, { withCredentials: true });

    stream.onopen = () => {
      setState('live');
      onStateChangeRef.current?.('live');
    };

    stream.addEventListener('notification', (event) => {
      try {
        const notification = JSON.parse((event as MessageEvent).data) as StreamNotification;
        onNotificationRef.current?.(notification);
      } catch {
        // ignore parse errors
      }
    });

    stream.onerror = () => {
      setState('fallback');
      onStateChangeRef.current?.('fallback');
    };

    return () => stream.close();
  }, [enabled]);

  return { state };
}

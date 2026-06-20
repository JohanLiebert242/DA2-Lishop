'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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

    const socket: Socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    let sseFallback: EventSource | null = null;

    socket.on('connect', () => {
      setState('live');
      onStateChangeRef.current?.('live');
    });

    socket.on('notification', (notification: StreamNotification) => {
      onNotificationRef.current?.(notification);
    });

    socket.on('connect_error', () => {
      if (sseFallback) return;
      sseFallback = new EventSource(`${API_URL}/notifications/stream`, { withCredentials: true });

      sseFallback.onopen = () => {
        setState('live');
        onStateChangeRef.current?.('live');
      };

      sseFallback.addEventListener('notification', (event) => {
        try {
          const notification = JSON.parse((event as MessageEvent).data) as StreamNotification;
          onNotificationRef.current?.(notification);
        } catch {

        }
      });

      sseFallback.onerror = () => {
        setState('fallback');
        onStateChangeRef.current?.('fallback');
      };
    });

    return () => {
      socket.close();
      sseFallback?.close();
    };
  }, [enabled]);

  return { state };
}

'use client';

import { useCallback, useState } from 'react';
import { useRealtime, StreamState } from './use-realtime';

export type AdminFeedEvent =
  | { type: 'new_order'; orderId: string; orderNumber: string; totalVnd: number; customerName?: string; timestamp: string }
  | { type: 'new_ticket'; ticketId: string; subject: string; customerName?: string; timestamp: string }
  | { type: 'return_request'; returnId: string; orderNumber: string; customerName?: string; timestamp: string }
  | { type: 'wallet_topup'; topupId: string; userId: string; amountVnd: number; customerName?: string; timestamp: string };

export interface AdminFeedOptions {
  enabled?: boolean;
  maxItems?: number;
  onFeed?: (event: AdminFeedEvent) => void;
}

export interface AdminFeedResult {
  state: StreamState;
  feed: AdminFeedEvent[];
  unreadCount: number;
  markAllRead: () => void;
  clearFeed: () => void;
}

function useAdminFeed(options: AdminFeedOptions = {}): AdminFeedResult {
  const { enabled = true, maxItems = 100, onFeed } = options;
  const [feed, setFeed] = useState<AdminFeedEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleFeed = useCallback(
    (data: unknown) => {
      const event = data as AdminFeedEvent;
      if (!event?.type) return;

      setFeed((prev) => [event, ...prev].slice(0, maxItems));
      setUnreadCount((prev) => prev + 1);
      onFeed?.(event);
    },
    [maxItems, onFeed],
  );

  const { state } = useRealtime({
    enabled,
    rooms: ['admin'],
    on: {
      'admin:feed': handleFeed,
    },
  });

  const markAllRead = useCallback(() => setUnreadCount(0), []);
  const clearFeed = useCallback(() => {
    setFeed([]);
    setUnreadCount(0);
  }, []);

  return { state, feed, unreadCount, markAllRead, clearFeed };
}

export { useAdminFeed };

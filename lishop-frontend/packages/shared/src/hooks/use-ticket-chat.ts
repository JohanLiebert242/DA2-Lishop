'use client';

import { useCallback, useState } from 'react';
import { useRealtime, StreamState } from './use-realtime';

export interface TicketMessageItem {
  id: string;
  ticketId: string;
  userId: string;
  isAdmin: boolean;
  content: string;
  createdAt: string;
}

export interface TicketChatOptions {
  enabled?: boolean;
  ticketId: string | null;
  onMessage?: (message: TicketMessageItem) => void;
  onStatusChange?: (data: { ticketId: string; status: string }) => void;
}

export interface TicketChatResult {
  state: StreamState;
  latestMessages: TicketMessageItem[];
  latestStatus: string | null;
  clearMessages: () => void;
}

function useTicketChat(options: TicketChatOptions): TicketChatResult {
  const { enabled = true, ticketId, onMessage, onStatusChange } = options;
  const [latestMessages, setLatestMessages] = useState<TicketMessageItem[]>([]);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);

  const rooms = ticketId ? [`ticket:${ticketId}`] : [];

  const handleMessage = useCallback(
    (data: unknown) => {
      const payload = data as { ticketId: string; message: TicketMessageItem };
      if (payload?.message) {
        setLatestMessages((prev) => [...prev.slice(-49), payload.message]);
        onMessage?.(payload.message);
      }
    },
    [onMessage],
  );

  const handleStatus = useCallback(
    (data: unknown) => {
      const payload = data as { ticketId: string; status: string };
      if (payload?.status) {
        setLatestStatus(payload.status);
        onStatusChange?.(payload);
      }
    },
    [onStatusChange],
  );

  const { state } = useRealtime({
    enabled: enabled && !!ticketId,
    rooms,
    on: {
      'ticket:message': handleMessage,
      'ticket:status': handleStatus,
    },
  });

  const clearMessages = useCallback(() => {
    setLatestMessages([]);
    setLatestStatus(null);
  }, []);

  return { state, latestMessages, latestStatus, clearMessages };
}

export { useTicketChat };

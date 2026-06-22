'use client';

import { useCallback, useState } from 'react';
import { useRealtime, StreamState } from './use-realtime';

export interface OrderStatusPayload {
  orderId: string;
  orderNumber: string;
  status: string;
  previousStatus?: string;
  timestamp: string;
}

export interface OrderRealtimeOptions {
  enabled?: boolean;
  orderId: string | null;
  onStatusChange?: (data: OrderStatusPayload) => void;
}

export interface OrderRealtimeResult {
  state: StreamState;
  currentStatus: string | null;
  clearStatus: () => void;
}

function useOrderRealtime(options: OrderRealtimeOptions): OrderRealtimeResult {
  const { enabled = true, orderId, onStatusChange } = options;
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  const rooms = orderId ? [`order:${orderId}`] : [];

  const handleStatus = useCallback(
    (data: unknown) => {
      const payload = data as OrderStatusPayload;
      if (payload?.status) {
        setCurrentStatus(payload.status);
        onStatusChange?.(payload);
      }
    },
    [onStatusChange],
  );

  const { state } = useRealtime({
    enabled: enabled && !!orderId,
    rooms,
    on: {
      'order:status': handleStatus,
    },
  });

  const clearStatus = useCallback(() => setCurrentStatus(null), []);

  return { state, currentStatus, clearStatus };
}

export { useOrderRealtime };

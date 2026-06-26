'use client';

import { useCallback, useState } from 'react';
import { useRealtime, StreamState } from './use-realtime';

export interface ShopChatMessageItem {
  id: string;
  shopId: string;
  userId: string;
  content: string;
  isFromShop: boolean;
  createdAt: string;
}

export interface ShopChatOptions {
  enabled?: boolean;
  shopId: string | null;
  onMessage?: (message: ShopChatMessageItem) => void;
}

export interface ShopChatResult {
  state: StreamState;
  latestMessages: ShopChatMessageItem[];
  clearMessages: () => void;
  isOnline: boolean;
}

function useShopChat(options: ShopChatOptions): ShopChatResult {
  const { enabled = true, shopId, onMessage } = options;
  const [latestMessages, setLatestMessages] = useState<ShopChatMessageItem[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  const rooms = shopId ? [`shop:${shopId}`] : [];

  const handleMessage = useCallback(
    (data: unknown) => {
      const payload = data as { shopId: string; message: ShopChatMessageItem };
      if (payload?.message) {
        setLatestMessages((prev) => [...prev.slice(-99), payload.message]);
        onMessage?.(payload.message);
      }
    },
    [onMessage],
  );

  const handleStatus = useCallback((data: unknown) => {
    const payload = data as { shopId: string; online: boolean; since: string };
    if (payload) {
      setIsOnline(payload.online);
    }
  }, []);

  const { state } = useRealtime({
    enabled: enabled && !!shopId,
    rooms,
    on: {
      'shop:chat': handleMessage,
      'shop:status': handleStatus,
    },
  });

  const clearMessages = useCallback(() => {
    setLatestMessages([]);
  }, []);

  return { state, latestMessages, clearMessages, isOnline };
}

export { useShopChat };

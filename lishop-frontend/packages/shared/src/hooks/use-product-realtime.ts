'use client';

import { useCallback, useState } from 'react';
import { useRealtime, StreamState } from './use-realtime';

export interface StockUpdatePayload {
  productId: string;
  stock: number;
  previousStock: number;
  delta: number;
  timestamp: string;
}

export interface FlashSalePayload {
  saleId: string;
  isActive: boolean;
  items: Array<{ id: string; productId: string; discountPercent: number }>;
  startAt: string;
  endAt: string;
}

export interface ProductRealtimeOptions {
  enabled?: boolean;
  productId: string | null;
  flashSaleIds?: string[];
  onStockChange?: (data: StockUpdatePayload) => void;
  onFlashSaleUpdate?: (data: FlashSalePayload) => void;
}

export interface ProductRealtimeResult {
  state: StreamState;
  stock: number | null;
  flashSale: FlashSalePayload | null;
  clear: () => void;
}

function useProductRealtime(options: ProductRealtimeOptions): ProductRealtimeResult {
  const { enabled = true, productId, flashSaleIds = [], onStockChange, onFlashSaleUpdate } = options;
  const [stock, setStock] = useState<number | null>(null);
  const [flashSale, setFlashSale] = useState<FlashSalePayload | null>(null);

  const rooms: string[] = [];
  if (productId) rooms.push(`product:${productId}:stock`);
  flashSaleIds.forEach((saleId) => rooms.push(`flashsale:${saleId}`));

  const handleStock = useCallback(
    (data: unknown) => {
      const payload = data as StockUpdatePayload;
      if (typeof payload?.stock === 'number') {
        setStock(payload.stock);
        onStockChange?.(payload);
      }
    },
    [onStockChange],
  );

  const handleFlashSale = useCallback(
    (data: unknown) => {
      const payload = data as FlashSalePayload;
      if (payload?.saleId) {
        setFlashSale(payload);
        onFlashSaleUpdate?.(payload);
      }
    },
    [onFlashSaleUpdate],
  );

  const { state } = useRealtime({
    enabled: enabled && !!productId,
    rooms,
    on: {
      'inventory:update': handleStock,
      'flashsale:update': handleFlashSale,
    },
  });

  const clear = useCallback(() => {
    setStock(null);
    setFlashSale(null);
  }, []);

  return { state, stock, flashSale, clear };
}

export { useProductRealtime };

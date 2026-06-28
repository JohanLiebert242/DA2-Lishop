'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { Toaster, toast } from '@lishop/ui';
import { NotificationStream, hasSessionCookie, useRealtime } from '@lishop/shared';
import type { StreamNotification } from '@lishop/shared';

function NotificationListener() {
  const handleNotification = useCallback((notification: StreamNotification) => {
    toast(notification.title, {
      description: notification.body,
      duration: 5000,
    });
  }, []);

  return (
    <NotificationStream
      enabled={hasSessionCookie()}
      onNotification={handleNotification}
    />
  );
}

/** Lắng nghe sự kiện order:status real-time và invalidate query tương ứng */
function OrderStatusListener() {
  const queryClient = useQueryClient();

  useRealtime({
    enabled: hasSessionCookie(),
    rooms: [],
    on: {
      'order:status': useCallback((data: unknown) => {
        const payload = data as { orderId: string; orderNumber: string; status: string };
        if (!payload?.orderId) return;
        // Invalidate danh sách đơn hàng
        queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
        // Invalidate chi tiết đơn hàng nếu đang xem
        queryClient.invalidateQueries({ queryKey: ['seller-order', payload.orderId] });
        // Hiển thị toast thông báo thay đổi trạng thái
        toast(`Đơn hàng #${payload.orderNumber} đã chuyển sang trạng thái mới`, {
          description: `Trạng thái: ${payload.status}`,
          duration: 5000,
        });
      }, [queryClient]),
    },
  });

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );

  return (
    <QueryClientProvider client={client}>
      <NotificationListener />
      <OrderStatusListener />
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

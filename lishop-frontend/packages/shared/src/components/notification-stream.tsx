'use client';

import { useNotificationStream } from '../hooks/use-notification-stream';
import type { StreamNotification } from '../hooks/use-notification-stream';

interface NotificationStreamProps {
  enabled: boolean;
  onNotification?: (notification: StreamNotification) => void;
}

export function NotificationStream({ enabled, onNotification }: NotificationStreamProps) {
  const { state } = useNotificationStream({
    enabled,
    onNotification,
  });

  // Expose connection state for debugging
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)['__lishop_notification_state'] = state;
  }

  return null;
}

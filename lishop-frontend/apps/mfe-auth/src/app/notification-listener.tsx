'use client';

import { useCallback } from 'react';
import { toast } from '@lishop/ui';
import { NotificationStream, hasSessionCookie } from '@lishop/shared';
import type { StreamNotification } from '@lishop/shared';

export function NotificationListener() {
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

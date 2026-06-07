export enum LishopEvent {
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  CART_UPDATED = 'CART_UPDATED',
  CART_CLEARED = 'CART_CLEARED',
  ORDER_PLACED = 'ORDER_PLACED',
  NOTIFICATION_RECEIVED = 'NOTIFICATION_RECEIVED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
}

export interface LishopEventPayloads {
  [LishopEvent.AUTH_LOGIN]: { userId: string; role: string };
  [LishopEvent.AUTH_LOGOUT]: undefined;
  [LishopEvent.CART_UPDATED]: { itemCount: number };
  [LishopEvent.CART_CLEARED]: undefined;
  [LishopEvent.ORDER_PLACED]: { orderId: string; orderNumber: string };
  [LishopEvent.NOTIFICATION_RECEIVED]: { notificationId: string };
  [LishopEvent.PROFILE_UPDATED]: {
    userId: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
  };
}

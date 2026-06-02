import { Injectable } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import { NotificationItem } from './notifications.repository';

export interface NotificationStreamEvent {
  userId: string;
  notification: NotificationItem;
}

@Injectable()
export class NotificationsStream {
  private readonly events$ = new Subject<NotificationStreamEvent>();

  publish(userId: string, notification: NotificationItem): void {
    this.events$.next({ userId, notification });
  }

  subscribe(userId: string): Observable<MessageEvent> {
    return this.events$.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({
        data: event.notification,
        type: 'notification',
      }) as MessageEvent),
    );
  }
}

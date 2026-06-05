import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationsRepository,
  NotificationPreferenceItem,
  NotificationItem,
} from './notifications.repository';
import { Observable } from 'rxjs';
import { NotificationsStream } from './notifications.stream';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly streamHub: NotificationsStream,
  ) {}

  getPreferences(userId: string): Promise<NotificationPreferenceItem[]> {
    return this.repo.getPreferences(userId);
  }

  upsertPreference(
    userId: string,
    eventType: string,
    data: { emailEnabled?: boolean; pushEnabled?: boolean; inAppEnabled?: boolean },
  ): Promise<NotificationPreferenceItem> {
    return this.repo.upsertPreference(userId, eventType, data);
  }

  listFeed(userId: string, page: number, limit: number): Promise<NotificationItem[]> {
    return this.repo.findByUserId(userId, page, limit);
  }

  stream(userId: string): Observable<MessageEvent> {
    return this.streamHub.subscribe(userId);
  }

  async markAsRead(id: string, userId: string): Promise<NotificationItem> {
    const result = await this.repo.markAsRead(id, userId);
    if (!result) throw new NotFoundException('Thông báo không tồn tại');
    return result;
  }

  markAllAsRead(userId: string): Promise<{ count: number }> {
    return this.repo.markAllAsRead(userId);
  }

  createNotification(
    userId: string,
    title: string,
    body: string,
    type: string,
    relatedId?: string,
  ): Promise<NotificationItem> {
    return this.repo.createNotification(userId, title, body, type, relatedId);
  }
}

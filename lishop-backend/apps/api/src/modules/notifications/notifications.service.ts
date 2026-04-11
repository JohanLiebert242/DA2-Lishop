import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationsRepository,
  NotificationPreferenceItem,
  NotificationItem,
} from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

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

  async markAsRead(id: string, userId: string): Promise<NotificationItem> {
    const result = await this.repo.markAsRead(id, userId);
    if (!result) throw new NotFoundException('Thông báo không tồn tại');
    return result;
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

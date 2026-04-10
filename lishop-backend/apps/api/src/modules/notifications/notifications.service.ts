import { Injectable } from '@nestjs/common';
import {
  NotificationsRepository,
  NotificationPreferenceItem,
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
}

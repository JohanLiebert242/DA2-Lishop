import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@lishop/database';

export const EVENT_TYPES = ['ORDER_STATUS', 'PROMOTIONS', 'NEW_PRODUCTS', 'REVIEWS'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface NotificationPreferenceItem {
  id: string;
  eventType: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

@Injectable()
export class NotificationsRepository {
  async getPreferences(userId: string): Promise<NotificationPreferenceItem[]> {
    const existing = await prisma.notificationPreference.findMany({
      where: { userId },
      select: {
        id: true,
        eventType: true,
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
      },
    });

    // Fill in defaults for any event types the user hasn't set yet
    const existingTypes = new Set(existing.map((p) => p.eventType));
    const defaults: NotificationPreferenceItem[] = EVENT_TYPES.filter(
      (et) => !existingTypes.has(et),
    ).map((et) => ({
      id: '',
      eventType: et,
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
    }));

    return [...existing, ...defaults].sort((a, b) => {
      const ia = EVENT_TYPES.indexOf(a.eventType as EventType);
      const ib = EVENT_TYPES.indexOf(b.eventType as EventType);
      return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    });
  }

  async upsertPreference(
    userId: string,
    eventType: string,
    data: { emailEnabled?: boolean; pushEnabled?: boolean; inAppEnabled?: boolean },
  ): Promise<NotificationPreferenceItem> {
    if (!EVENT_TYPES.includes(eventType as EventType)) {
      throw new BadRequestException(`eventType invalide : ${eventType}`);
    }

    return prisma.notificationPreference.upsert({
      where: { userId_eventType: { userId, eventType } },
      create: {
        userId,
        eventType,
        emailEnabled: data.emailEnabled ?? true,
        pushEnabled: data.pushEnabled ?? true,
        inAppEnabled: data.inAppEnabled ?? true,
      },
      update: {
        ...(data.emailEnabled !== undefined && { emailEnabled: data.emailEnabled }),
        ...(data.pushEnabled !== undefined && { pushEnabled: data.pushEnabled }),
        ...(data.inAppEnabled !== undefined && { inAppEnabled: data.inAppEnabled }),
      },
      select: {
        id: true,
        eventType: true,
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
      },
    });
  }
}

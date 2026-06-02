import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@lishop/database';
import { NotificationsStream } from './notifications.stream';

export const EVENT_TYPES = ['ORDER_STATUS', 'PROMOTIONS', 'NEW_PRODUCTS', 'REVIEWS'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface NotificationPreferenceItem {
  id: string;
  eventType: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  relatedId: string | null;
  isRead: boolean;
  createdAt: Date;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly stream: NotificationsStream) {}

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

  async findByUserId(userId: string, page: number, limit: number): Promise<NotificationItem[]> {
    const cappedLimit = Math.min(limit, 100);
    const skip = (page - 1) * cappedLimit;
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: cappedLimit,
      select: {
        id: true,
        userId: true,
        title: true,
        body: true,
        type: true,
        relatedId: true,
        isRead: true,
        createdAt: true,
      },
    }) as Promise<NotificationItem[]>;
  }

  async markAsRead(id: string, userId: string): Promise<NotificationItem | null> {
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (result.count === 0) return null;
    return prisma.notification.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        body: true,
        type: true,
        relatedId: true,
        isRead: true,
        createdAt: true,
      },
    }) as Promise<NotificationItem | null>;
  }

  async createNotification(
    userId: string,
    title: string,
    body: string,
    type: string,
    relatedId?: string,
  ): Promise<NotificationItem> {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        relatedId: relatedId ?? null,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        body: true,
        type: true,
        relatedId: true,
        isRead: true,
        createdAt: true,
      },
    }) as NotificationItem;
    this.stream.publish(userId, notification);
    return notification;
  }
}

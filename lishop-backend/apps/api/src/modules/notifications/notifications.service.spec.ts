import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsStream } from './notifications.stream';

const mockPrefs = [
  { id: 'p1', eventType: 'ORDER_STATUS', emailEnabled: true, pushEnabled: true, inAppEnabled: true },
  { id: 'p2', eventType: 'PROMOTIONS', emailEnabled: false, pushEnabled: true, inAppEnabled: true },
];

const mockNotif = {
  id: 'n1',
  userId: 'u1',
  title: 'Đơn hàng mới',
  body: 'Đơn hàng LS-001 đã được đặt.',
  type: 'ORDER_STATUS',
  relatedId: 'order1',
  isRead: false,
  createdAt: new Date(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  const repo = {
    getPreferences: jest.fn(),
    upsertPreference: jest.fn(),
    findByUserId: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    createNotification: jest.fn(),
  };
  const streamHub = { subscribe: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: repo },
        { provide: NotificationsStream, useValue: streamHub },
      ],
    }).compile();
    service = module.get(NotificationsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getPreferences delegates to repository', async () => {
    repo.getPreferences.mockResolvedValue(mockPrefs);
    const result = await service.getPreferences('u1');
    expect(repo.getPreferences).toHaveBeenCalledWith('u1');
    expect(result).toHaveLength(2);
  });

  it('upsertPreference delegates to repository with correct args', async () => {
    const updated = { ...mockPrefs[0], emailEnabled: false };
    repo.upsertPreference.mockResolvedValue(updated);
    const result = await service.upsertPreference('u1', 'ORDER_STATUS', { emailEnabled: false });
    expect(repo.upsertPreference).toHaveBeenCalledWith('u1', 'ORDER_STATUS', { emailEnabled: false });
    expect(result.emailEnabled).toBe(false);
  });

  it('listFeed returns paginated notifications', async () => {
    repo.findByUserId.mockResolvedValue([mockNotif]);
    const result = await service.listFeed('u1', 1, 20);
    expect(repo.findByUserId).toHaveBeenCalledWith('u1', 1, 20);
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('Đơn hàng mới');
  });

  it('markAsRead delegates to repository and returns notification', async () => {
    repo.markAsRead.mockResolvedValue({ ...mockNotif, isRead: true });
    const result = await service.markAsRead('n1', 'u1');
    expect(repo.markAsRead).toHaveBeenCalledWith('n1', 'u1');
    expect(result.isRead).toBe(true);
  });

  it('markAsRead throws NotFoundException when notification not found', async () => {
    repo.markAsRead.mockResolvedValue(null);
    await expect(service.markAsRead('notfound', 'u1')).rejects.toThrow(NotFoundException);
  });

  it('markAllAsRead delegates to repository and returns updated count', async () => {
    repo.markAllAsRead.mockResolvedValue({ count: 3 });
    const result = await service.markAllAsRead('u1');
    expect(repo.markAllAsRead).toHaveBeenCalledWith('u1');
    expect(result.count).toBe(3);
  });

  it('createNotification delegates to repository', async () => {
    repo.createNotification.mockResolvedValue(mockNotif);
    await service.createNotification('u1', 'Đơn hàng mới', 'Đơn hàng LS-001 đã được đặt.', 'ORDER_STATUS', 'order1');
    expect(repo.createNotification).toHaveBeenCalledWith('u1', 'Đơn hàng mới', 'Đơn hàng LS-001 đã được đặt.', 'ORDER_STATUS', 'order1');
  });
  it('stream delegates to stream hub', () => {
    const observable = { subscribe: jest.fn() };
    streamHub.subscribe.mockReturnValue(observable);
    const result = service.stream('u1');
    expect(streamHub.subscribe).toHaveBeenCalledWith('u1');
    expect(result).toBe(observable);
  });
});

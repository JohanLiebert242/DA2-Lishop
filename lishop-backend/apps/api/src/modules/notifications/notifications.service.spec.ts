import { Test } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';

const mockPrefs = [
  { id: 'p1', eventType: 'ORDER_STATUS', emailEnabled: true, pushEnabled: true, inAppEnabled: true },
  { id: 'p2', eventType: 'PROMOTIONS', emailEnabled: false, pushEnabled: true, inAppEnabled: true },
];

describe('NotificationsService', () => {
  let service: NotificationsService;
  const repo = {
    getPreferences: jest.fn(),
    upsertPreference: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: repo },
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
});

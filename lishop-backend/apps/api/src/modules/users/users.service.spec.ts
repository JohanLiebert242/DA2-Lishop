import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hash',
  firstName: 'Test',
  lastName: 'User',
  role: 'CUSTOMER',
  emailVerified: false,
  googleId: null,
  facebookId: null,
  avatarUrl: null,
  loyaltyPoints: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;
  const mockRepo = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    findByGoogleId: jest.fn(),
    findByFacebookId: jest.fn(),
    getLoyaltyHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findByEmail should return user', async () => {
    mockRepo.findByEmail.mockResolvedValue(mockUser);
    const result = await service.findByEmail('test@example.com');
    expect(result).toEqual(mockUser);
    expect(mockRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('findById should return user', async () => {
    mockRepo.findById.mockResolvedValue(mockUser);
    const result = await service.findById('user-1');
    expect(result).toEqual(mockUser);
    expect(mockRepo.findById).toHaveBeenCalledWith('user-1');
  });

  it('create should call repo with data', async () => {
    mockRepo.create.mockResolvedValue(mockUser);
    const result = await service.create({
      email: 'test@example.com',
      passwordHash: 'hash',
      firstName: 'Test',
      lastName: 'User',
    });
    expect(result).toEqual(mockUser);
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('findByGoogleId should return user', async () => {
    mockRepo.findByGoogleId.mockResolvedValue(mockUser);
    const result = await service.findByGoogleId('google-id-1');
    expect(result).toEqual(mockUser);
    expect(mockRepo.findByGoogleId).toHaveBeenCalledWith('google-id-1');
  });

  it('findByFacebookId should return user', async () => {
    mockRepo.findByFacebookId.mockResolvedValue(mockUser);
    const result = await service.findByFacebookId('fb-id-1');
    expect(result).toEqual(mockUser);
    expect(mockRepo.findByFacebookId).toHaveBeenCalledWith('fb-id-1');
  });

  it('updateById should call repo with data', async () => {
    const updated = { ...mockUser, firstName: 'Updated' };
    mockRepo.updateById.mockResolvedValue(updated);
    const result = await service.updateById('user-1', { firstName: 'Updated' });
    expect(result).toEqual(updated);
    expect(mockRepo.updateById).toHaveBeenCalledWith('user-1', { firstName: 'Updated' });
  });

  it('getLoyaltyHistory delegates to repository', async () => {
    const mockHistory = [
      { id: 'lp1', points: 100, description: 'Đặt hàng LS-001', createdAt: new Date() },
      { id: 'lp2', points: -50, description: 'Đổi điểm', createdAt: new Date() },
    ];
    mockRepo.getLoyaltyHistory.mockResolvedValue(mockHistory);
    const result = await service.getLoyaltyHistory('u1');
    expect(mockRepo.getLoyaltyHistory).toHaveBeenCalledWith('u1');
    expect(result).toHaveLength(2);
    expect(result[0]!.points).toBe(100);
  });
});

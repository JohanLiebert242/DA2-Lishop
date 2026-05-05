import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from './jwt.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: null as string | null,
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

describe('AuthService — credentials', () => {
  let service: AuthService;
  const usersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    findByGoogleId: jest.fn(),
    findByFacebookId: jest.fn(),
  };
  const jwtService = {
    signAccessToken: jest.fn().mockResolvedValue('access-token'),
    signRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    getRemainingTtl: jest.fn().mockReturnValue(900),
  };
  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn().mockResolvedValue(false),
  };
  const mailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.register({ email: 'test@example.com', password: 'pass1234', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user, send verification email, return tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const created = { ...mockUser, email: 'new@example.com', passwordHash: 'hashed' };
      usersService.create.mockResolvedValue(created);
      const result = await service.register({
        email: 'new@example.com',
        password: 'pass1234',
        firstName: 'New',
        lastName: 'User',
      });
      expect(usersService.create).toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith('new@example.com', expect.any(String));
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password invalid', async () => {
      const user = { ...mockUser, passwordHash: await bcrypt.hash('correct', 10) };
      usersService.findByEmail.mockResolvedValue(user);
      await expect(service.login({ email: user.email, password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('pass1234', 10);
      const user = { ...mockUser, passwordHash: hash };
      usersService.findByEmail.mockResolvedValue(user);
      const result = await service.login({ email: user.email, password: 'pass1234' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('logout', () => {
    it('should blacklist the access token jti', async () => {
      jwtService.verifyAccessToken.mockResolvedValue({ jti: 'jti-abc', exp: Math.floor(Date.now() / 1000) + 900 });
      await service.logout('some-token');
      expect(redisService.setex).toHaveBeenCalledWith('blacklist:token:jti-abc', expect.any(Number), '1');
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException on invalid refresh token', async () => {
      jwtService.verifyRefreshToken.mockRejectedValue(new Error('invalid'));
      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when refresh token is blacklisted', async () => {
      jwtService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', jti: 'jti-revoked', exp: 9999999999 });
      redisService.get.mockResolvedValue('1'); // blacklisted
      await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should rotate tokens and blacklist the consumed refresh token', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      jwtService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', jti: 'jti-xyz', exp });
      redisService.get.mockResolvedValue(null); // not blacklisted
      usersService.findById.mockResolvedValue(mockUser);
      const result = await service.refresh('valid-refresh-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(redisService.setex).toHaveBeenCalledWith('blacklist:refresh:jti-xyz', expect.any(Number), '1');
    });
  });

  describe('me', () => {
    it('should return user without passwordHash', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      const result = await service.me('user-1');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});

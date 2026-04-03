import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '../jwt.service';
import { RedisService } from '../../redis/redis.service';

function mockContext(headers: Record<string, string> = {}) {
  const request = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const jwtService = { verifyAccessToken: jest.fn() };
  const redisService = { exists: jest.fn().mockResolvedValue(false) };
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };

  beforeEach(() => {
    guard = new JwtAuthGuard(
      jwtService as any,
      redisService as any,
      reflector as any,
    );
  });

  afterEach(() => jest.resetAllMocks());

  it('allows public routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const result = await guard.canActivate(mockContext());
    expect(result).toBe(true);
  });

  it('throws if no bearer token', async () => {
    await expect(guard.canActivate(mockContext())).rejects.toThrow(UnauthorizedException);
  });

  it('throws if token is blacklisted', async () => {
    jwtService.verifyAccessToken.mockResolvedValue({ sub: 'u1', jti: 'jti-1', email: 'a@b.com', role: 'CUSTOMER' });
    redisService.exists.mockResolvedValue(true);
    await expect(guard.canActivate(mockContext({ authorization: 'Bearer token' }))).rejects.toThrow(UnauthorizedException);
  });

  it('sets user on request when token is valid', async () => {
    jwtService.verifyAccessToken.mockResolvedValue({ sub: 'u1', jti: 'jti-2', email: 'a@b.com', role: 'CUSTOMER' });
    redisService.exists.mockResolvedValue(false);
    const ctx = mockContext({ authorization: 'Bearer valid-token' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});

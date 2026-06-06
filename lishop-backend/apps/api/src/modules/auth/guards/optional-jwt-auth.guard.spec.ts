import { ExecutionContext } from '@nestjs/common';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

function mockContext({
  headers = {},
  cookies = {},
}: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
} = {}) {
  const request: Record<string, unknown> = { headers, cookies };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;
  const jwtService = { verifyAccessToken: jest.fn() };
  const redisService = { exists: jest.fn().mockResolvedValue(false) };

  beforeEach(() => {
    guard = new OptionalJwtAuthGuard(jwtService as any, redisService as any);
  });

  afterEach(() => jest.resetAllMocks());

  it('allows guest access when no token is present', async () => {
    await expect(guard.canActivate(mockContext())).resolves.toBe(true);
    expect(jwtService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('sets request.user when the bearer token is valid', async () => {
    jwtService.verifyAccessToken.mockResolvedValue({
      sub: 'u1',
      jti: 'jti-1',
      email: 'a@b.com',
      role: 'CUSTOMER',
    });

    const ctx = mockContext({ headers: { authorization: 'Bearer valid-token' } });
    const request = ctx.switchToHttp().getRequest() as Record<string, unknown>;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', email: 'a@b.com', role: 'CUSTOMER' });
  });

  it('uses the lishop_at cookie when no bearer token is present', async () => {
    jwtService.verifyAccessToken.mockResolvedValue({
      sub: 'u2',
      jti: 'jti-2',
      email: 'cookie@user.com',
      role: 'CUSTOMER',
    });

    const ctx = mockContext({ cookies: { lishop_at: 'cookie-token' } });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(jwtService.verifyAccessToken).toHaveBeenCalledWith('cookie-token');
  });

  it('treats revoked tokens as guest access', async () => {
    jwtService.verifyAccessToken.mockResolvedValue({
      sub: 'u3',
      jti: 'revoked-jti',
      email: 'revoked@user.com',
      role: 'CUSTOMER',
    });
    redisService.exists.mockResolvedValue(true);

    const ctx = mockContext({ headers: { authorization: 'Bearer revoked-token' } });
    const request = ctx.switchToHttp().getRequest() as Record<string, unknown>;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('treats invalid payloads as guest access', async () => {
    jwtService.verifyAccessToken.mockResolvedValue(null);

    const ctx = mockContext({ headers: { authorization: 'Bearer bad-token' } });
    const request = ctx.switchToHttp().getRequest() as Record<string, unknown>;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });
});

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@lishop/contracts';

function mockCtx(user: { role: string } | null) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  const reflector = { getAllAndOverride: jest.fn() };

  beforeEach(() => {
    guard = new RolesGuard(reflector as any);
  });

  afterEach(() => jest.resetAllMocks());

  it('allows when no roles required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(await guard.canActivate(mockCtx(null))).toBe(true);
  });

  it('allows when empty roles array', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(mockCtx(null))).resolves.toBe(true);
  });

  it('allows when user has required role', async () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(await guard.canActivate(mockCtx({ role: UserRole.ADMIN }))).toBe(true);
  });

  it('throws when user has wrong role', async () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    await expect(guard.canActivate(mockCtx({ role: UserRole.CUSTOMER }))).rejects.toThrow(ForbiddenException);
  });

  it('throws when no user', async () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    await expect(guard.canActivate(mockCtx(null))).rejects.toThrow(ForbiddenException);
  });
});

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from './jwt.service';

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string> = {
                JWT_ACCESS_SECRET: 'test-access-secret-32chars-minimum!!',
                JWT_REFRESH_SECRET: 'test-refresh-secret-32chars-min!!',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();
    service = module.get(JwtService);
  });

  it('should sign and verify an access token', async () => {
    const payload = { sub: 'user-1', email: 'test@example.com', role: 'CUSTOMER' };
    const token = await service.signAccessToken(payload);
    expect(typeof token).toBe('string');
    const decoded = await service.verifyAccessToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.jti).toBeDefined();
  });

  it('should sign and verify a refresh token', async () => {
    const token = await service.signRefreshToken('user-1');
    const decoded = await service.verifyRefreshToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.jti).toBeDefined();
  });

  it('should throw on invalid access token', async () => {
    await expect(service.verifyAccessToken('invalid.token.here')).rejects.toThrow();
  });
});

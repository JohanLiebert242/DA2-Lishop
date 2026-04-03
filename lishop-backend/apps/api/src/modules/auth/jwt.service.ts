import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { randomUUID } from 'crypto';

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  jti: string;
}

@Injectable()
export class JwtService {
  private readonly accessSecret: Uint8Array;
  private readonly refreshSecret: Uint8Array;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(private readonly config: ConfigService) {
    this.accessSecret = new TextEncoder().encode(
      this.config.get<string>('JWT_ACCESS_SECRET')!,
    );
    this.refreshSecret = new TextEncoder().encode(
      this.config.get<string>('JWT_REFRESH_SECRET')!,
    );
    this.accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    this.refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
  }

  async signAccessToken(payload: { sub: string; email: string; role: string }): Promise<string> {
    return new SignJWT({ ...payload, jti: randomUUID() })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.accessExpiresIn)
      .sign(this.accessSecret);
  }

  async signRefreshToken(userId: string): Promise<string> {
    return new SignJWT({ sub: userId, jti: randomUUID() })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.refreshExpiresIn)
      .sign(this.refreshSecret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret);
    return payload as AccessTokenPayload;
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const { payload } = await jwtVerify(token, this.refreshSecret);
    return payload as RefreshTokenPayload;
  }

  /** Returns the TTL (seconds) remaining for a token based on its exp claim */
  getRemainingTtl(exp: number): number {
    return Math.max(0, exp - Math.floor(Date.now() / 1000));
  }
}

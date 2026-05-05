import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtService } from '../jwt.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = (request.cookies as Record<string, string>)?.['refresh_token'];
    if (!token) throw new UnauthorizedException('Missing refresh token');

    let payload;
    try {
      payload = await this.jwtService.verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.jti) {
      const revoked = await this.redisService.exists(`blacklist:refresh:${payload.jti}`);
      if (revoked) throw new UnauthorizedException('Refresh token has been revoked');
    }

    (request as any).refreshToken = token;
    (request as any).user = { id: payload.sub };
    return true;
  }
}

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtService } from '../jwt.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractBearerToken(request);
    if (!token) return true;

    try {
      const payload = await this.jwtService.verifyAccessToken(token);
      if (payload.jti) {
        const blacklisted = await this.redisService.exists(`blacklist:token:${payload.jti}`);
        if (blacklisted) return true;
      }
      (request as any).user = { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      return true;
    }
    return true;
  }

  private extractBearerToken(request: FastifyRequest): string | null {
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return (request.cookies as Record<string, string>)?.['lishop_at'] ?? null;
  }
}

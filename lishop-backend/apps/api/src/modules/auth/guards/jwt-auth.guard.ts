import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { JwtService } from '../jwt.service';
import { RedisService } from '../../redis/redis.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException('Missing access token');

    let payload;
    try {
      payload = await this.jwtService.verifyAccessToken(token);
      if (!payload) throw new Error('No payload');
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    if (payload.jti) {
      const blacklisted = await this.redisService.exists(`blacklist:token:${payload.jti}`);
      if (blacklisted) throw new UnauthorizedException('Token has been revoked');
    }

    (request as any).user = { id: payload.sub, email: payload.email, role: payload.role };
    return true;
  }

  private extractBearerToken(request: FastifyRequest): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}

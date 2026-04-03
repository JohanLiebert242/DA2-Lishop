import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtService } from '../jwt.service';

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

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

    (request as any).refreshToken = token;
    (request as any).user = { id: payload.sub };
    return true;
  }
}

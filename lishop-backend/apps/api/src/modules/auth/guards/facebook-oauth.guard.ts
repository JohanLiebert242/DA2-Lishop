import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';

interface FacebookTokenResponse {
  access_token: string;
}

interface FacebookUserInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  picture?: { data: { url: string } };
}

@Injectable()
export class FacebookOAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const code = (request.query as Record<string, string>).code;
    if (!code) return false;

    const clientId = this.config.get<string>('FACEBOOK_CLIENT_ID');
    const clientSecret = this.config.get<string>('FACEBOOK_CLIENT_SECRET');
    const redirectUri = `${this.getApiOrigin(request)}/auth/oauth/facebook/callback`;

    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({ client_id: clientId!, client_secret: clientSecret!, redirect_uri: redirectUri, code }),
    );
    const tokenData = (await tokenRes.json()) as FacebookTokenResponse;

    const userRes = await fetch(
      `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${tokenData.access_token}`,
    );
    const userInfo = (await userRes.json()) as FacebookUserInfo;

    (request as any).oauthUser = {
      provider: 'facebook' as const,
      providerId: userInfo.id,
      email: userInfo.email,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      avatarUrl: userInfo.picture?.data?.url,
    };
    return true;
  }

  private getApiOrigin(request: FastifyRequest): string {
    const forwardedProto = request.headers['x-forwarded-proto'];
    const proto = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto ?? request.protocol ?? 'http';
    const host = request.headers['host'] ?? 'localhost:4000';
    return `${proto}://${host}`;
  }
}

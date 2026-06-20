import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '../auth/jwt.service';
import { RedisService } from '../redis/redis.service';
import { NotificationItem } from './notifications.repository';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/',
})
@Injectable()
export class NotificationsGateway {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`WebSocket connection rejected: no token`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAccessToken(token);
      if (!payload) {
        this.logger.warn(`WebSocket connection rejected: invalid token`);
        client.disconnect();
        return;
      }

      if (payload.jti) {
        const blacklisted = await this.redisService.exists(`blacklist:token:${payload.jti}`);
        if (blacklisted) {
          this.logger.warn(`WebSocket connection rejected: token revoked`);
          client.disconnect();
          return;
        }
      }

      const userId = payload.sub;
      client.data.userId = userId;
      client.join(`user:${userId}`);
      this.logger.log(`WebSocket connected: user=${userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId;
    if (userId) {
      this.logger.log(`WebSocket disconnected: user=${userId}`);
    }
  }

  sendToUser(userId: string, notification: NotificationItem): void {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  private extractToken(client: Socket): string | null {
    const cookie = client.handshake.headers.cookie;
    if (!cookie) return null;

    const cookies = this.parseCookies(cookie);
    const token = cookies['lishop_at'];
    if (token) return token;

    const auth = client.handshake.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);

    return null;
  }

  private parseCookies(cookie: string): Record<string, string> {
    const result: Record<string, string> = {};
    cookie.split(';').forEach((pair) => {
      const idx = pair.indexOf('=');
      if (idx === -1) return;
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (key) result[key] = value;
    });
    return result;
  }
}

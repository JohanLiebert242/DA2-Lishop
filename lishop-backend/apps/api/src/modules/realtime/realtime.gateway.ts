import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '../auth/jwt.service';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/',
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

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
        this.logger.warn('WebSocket connection rejected: no token');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAccessToken(token);
      if (!payload) {
        this.logger.warn('WebSocket connection rejected: invalid token');
        client.disconnect();
        return;
      }

      if (payload.jti) {
        const blacklisted = await this.redisService.exists(`blacklist:token:${payload.jti}`);
        if (blacklisted) {
          this.logger.warn('WebSocket connection rejected: token revoked');
          client.disconnect();
          return;
        }
      }

      const userId = payload.sub;
      const userRole = payload.role;

      client.data.userId = userId;
      client.data.role = userRole;

      client.join(`user:${userId}`);
      this.logger.log(`WebSocket connected: user=${userId} role=${userRole}`);

      // Admin auto-joins the admin broadcast room
      if (userRole === 'ADMIN') {
        client.join('admin');
        this.logger.log(`Admin auto-joined 'admin' room: user=${userId}`);
      }
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

  // ─── Client requests ───

  @SubscribeMessage('room:join')
  handleRoomJoin(client: Socket, payload: { room: string }): void {
    if (!payload?.room) return;
    client.join(payload.room);
    this.logger.log(`Client ${client.data.userId} joined room: ${payload.room}`);
  }

  @SubscribeMessage('room:leave')
  handleRoomLeave(client: Socket, payload: { room: string }): void {
    if (!payload?.room) return;
    client.leave(payload.room);
  }

  // ─── Server emit helpers ───

  sendToUser(userId: string, event: string, data: unknown): void {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToAdmins(event: string, data: unknown): void {
    if (!this.server) return;
    this.server.to('admin').emit(event, data);
  }

  sendToRoom(room: string, event: string, data: unknown): void {
    if (!this.server) return;
    this.server.to(room).emit(event, data);
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

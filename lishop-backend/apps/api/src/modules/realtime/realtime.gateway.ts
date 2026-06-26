import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { prisma } from '@lishop/database';
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

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.userId;
    if (userId) {
      // Check if user owns a shop and mark them offline
      try {
        const shop = await prisma.shop.findUnique({ where: { userId }, select: { id: true } });
        if (shop) {
          await this.redisService.del(`presence:shop:${shop.id}`);
          this.sendToRoom(`shop:${shop.id}`, 'shop:status', {
            shopId: shop.id,
            online: false,
            since: new Date().toISOString(),
          });
          this.logger.log(`Shop ${shop.id} marked offline (user ${userId} disconnected)`);
        }
      } catch {
        // Non-critical; just log
      }
      this.logger.log(`WebSocket disconnected: user=${userId}`);
    }
  }

  // ─── Client requests ───

  @SubscribeMessage('room:join')
  async handleRoomJoin(client: Socket, payload: { room: string }): Promise<void> {
    if (!payload?.room) return;

    const userId = client.data.userId;
    const role = client.data.role;
    const room = payload.room;

    // user:{userId} — only the matching user
    if (room.startsWith('user:')) {
      const targetUserId = room.slice(5);
      if (targetUserId !== userId) {
        this.logger.warn(`User ${userId} denied joining ${room}: not the target user`);
        return;
      }
      client.join(room);
      this.logger.log(`Client ${userId} joined room: ${room}`);
      return;
    }

    // shop:{shopId} — any authenticated user (shopId is a non-guessable UUID)
    // Messages are shop-scoped chat; exposure is limited and no worse than HTTP polling
    if (room.startsWith('shop:')) {
      const shopId = room.slice(5);
      client.join(room);

      // If user is the shop owner, mark them online in Redis and emit presence
      try {
        const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { userId: true } });
        if (shop && shop.userId === userId) {
          const now = new Date().toISOString();
          await this.redisService.setex(`presence:shop:${shopId}`, 120, JSON.stringify({ userId, onlineSince: now }));
          // Broadcast online status to everyone watching this shop
          this.sendToRoom(room, 'shop:status', { shopId, online: true, since: now });
          this.logger.log(`Shop ${shopId} marked online (owner ${userId} connected)`);
        }
      } catch {
        // Non-critical
      }

      this.logger.log(`Client ${userId} joined room: ${room}`);
      return;
    }

    // ticket:{ticketId} — ticket owner or admin
    if (room.startsWith('ticket:')) {
      const ticketId = room.slice(7);
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: { userId: true },
      });
      if (ticket && (ticket.userId === userId || role === 'ADMIN')) {
        client.join(room);
        this.logger.log(`Client ${userId} joined room: ${room}`);
        return;
      }
      this.logger.warn(`User ${userId} denied joining ${room}: no permission`);
      return;
    }

    // admin room — only admins
    if (room === 'admin' && role !== 'ADMIN') {
      this.logger.warn(`User ${userId} denied joining admin room`);
      return;
    }

    // All other rooms: allow
    client.join(room);
    this.logger.log(`Client ${userId} joined room: ${room}`);
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

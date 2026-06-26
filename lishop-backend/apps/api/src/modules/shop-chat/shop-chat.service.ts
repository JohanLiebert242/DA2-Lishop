import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@lishop/database';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class ShopChatService {
  constructor(private readonly realtime: RealtimeService) {}

  async getMessages(shopSlug: string, userId: string) {
    const shop = await prisma.shop.findUnique({ where: { slug: shopSlug } });
    if (!shop) throw new NotFoundException('Cửa hàng không tồn tại');

    const messages = await prisma.shopChatMessage.findMany({
      where: { shopId: shop.id, userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return { shopId: shop.id, shopName: shop.name, messages };
  }

  async sendMessage(shopSlug: string, userId: string, content: string) {
    const shop = await prisma.shop.findUnique({ where: { slug: shopSlug } });
    if (!shop) throw new NotFoundException('Cửa hàng không tồn tại');

    const message = await prisma.shopChatMessage.create({
      data: { shopId: shop.id, userId, content, isFromShop: false },
    });

    this.realtime.emitShopChatMessage(shop.id, message);

    return message;
  }

  async getSellerConversations(shopId: string) {
    // Get the latest message per customer for this shop
    const raw = await prisma.$queryRaw<
      Array<{ userId: string; content: string; createdAt: Date; firstName: string; lastName: string; avatarUrl: string | null }>
    >`
      SELECT DISTINCT ON (m."userId")
        m."userId",
        m."content",
        m."createdAt",
        u."firstName",
        u."lastName",
        u."avatarUrl"
      FROM "ShopChatMessage" m
      JOIN "User" u ON u.id = m."userId"
      WHERE m."shopId" = ${shopId}
      ORDER BY m."userId", m."createdAt" DESC
    `;

    return raw.map((row) => ({
      userId: row.userId,
      customerName: `${row.firstName} ${row.lastName}`,
      avatarUrl: row.avatarUrl,
      lastMessage: row.content,
      lastMessageAt: row.createdAt,
    }));
  }

  async getSellerConversationMessages(shopId: string, customerUserId: string, sellerUserId: string) {
    // Verify the seller owns this shop
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.userId !== sellerUserId) {
      throw new ForbiddenException('Bạn không có quyền xem hội thoại này');
    }

    const messages = await prisma.shopChatMessage.findMany({
      where: { shopId, userId: customerUserId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    return messages;
  }

  async sendSellerReply(shopId: string, customerUserId: string, sellerUserId: string, content: string) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.userId !== sellerUserId) {
      throw new ForbiddenException('Bạn không có quyền trả lời hội thoại này');
    }

    const message = await prisma.shopChatMessage.create({
      data: { shopId, userId: customerUserId, content, isFromShop: true },
    });

    this.realtime.emitShopChatMessage(shopId, message);

    return message;
  }
}

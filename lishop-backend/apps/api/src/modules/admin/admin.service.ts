import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRepository, AdminStats, AdminOrderItem, AdminUserItem, AdminCoupon, AdminAnalytics } from './admin.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { InvoicesService } from '../invoices/invoices.service';
import { RedisService } from '../redis/redis.service';
import { AddTrackingEventDto } from '../orders/dto/add-tracking-event.dto';
import { OrderStatus, prisma } from '@lishop/database';
import { UserRole } from '@lishop/contracts';
import { ProductsService } from '../products/products.service';
import { ImportProductDto, ImportProductsDto } from './dto/import-products.dto';
import { GenerateProductCopyDto } from './dto/generate-product-copy.dto';

const STATS_CACHE_KEY = 'cache:admin:stats';
const STATS_TTL = 300; // 5 minutes
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';

const VALID_ORDER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PENDING]:    [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]:    [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]:  [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]:  [],
  [OrderStatus.REFUNDED]:   [],
};

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly notifRepo: NotificationsRepository,
    private readonly invoicesService: InvoicesService,
    private readonly redis: RedisService,
    private readonly productsService: ProductsService,
    private readonly config: ConfigService,
  ) {}

  async getStats(): Promise<AdminStats> {
    const cached = await this.redis.get(STATS_CACHE_KEY);
    if (cached) return JSON.parse(cached) as AdminStats;
    const stats = await this.repo.getStats();
    await this.redis.setex(STATS_CACHE_KEY, STATS_TTL, JSON.stringify(stats));
    return stats;
  }

  listOrders(page = 1, limit = 50): Promise<{ orders: AdminOrderItem[]; total: number }> {
    return this.repo.findAllOrders(page, limit);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<AdminOrderItem> {
    const order = await this.repo.findOrderById(orderId);
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const validNext = VALID_ORDER_TRANSITIONS[order.status] ?? [];
    if (!validNext.includes(status)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ ${order.status} sang ${status}`,
      );
    }

    const updated = await this.repo.updateOrderStatus(orderId, status);

    if (status === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
      await this.awardLoyalty(orderId, order.userId, order.orderNumber);
      this.invoicesService.generateForOrder(orderId)
        .catch((err: unknown) => console.error('[AdminService] invoice generation failed', err));
    }
    this.notifRepo
      .createNotification(
        order.userId,
        'Trạng thái đơn hàng đã thay đổi',
        `Đơn hàng #${order.orderNumber} đã chuyển sang trạng thái: ${status}.`,
        'ORDER_STATUS',
        orderId,
      )
      .catch((err: unknown) => console.error('[AdminService] notification failed', err));
    return updated;
  }

  private async awardLoyalty(orderId: string, userId: string, orderNumber: string): Promise<void> {
    const full = await prisma.order.findUnique({ where: { id: orderId }, select: { totalVnd: true } });
    if (!full) return;
    const points = Math.floor(full.totalVnd / 1000);
    if (points <= 0) return;

    // Idempotency guard: skip if loyalty was already awarded for this order
    const alreadyAwarded = await prisma.loyaltyPoint.findFirst({
      where: { userId, description: `Tích điểm đơn hàng #${orderNumber}` },
    });
    if (alreadyAwarded) return;

    await prisma.$transaction([
      prisma.loyaltyPoint.create({
        data: { userId, points, description: `Tích điểm đơn hàng #${orderNumber}` },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: points } },
      }),
    ]);
    this.notifRepo
      .createNotification(
        userId,
        'Bạn nhận được điểm tích lũy!',
        `Bạn nhận được ${points} điểm từ đơn hàng #${orderNumber}.`,
        'ORDER_STATUS',
        orderId,
      )
      .catch((err: unknown) => console.error('[AdminService] loyalty notification failed', err));
  }

  async addTrackingEvent(orderId: string, dto: AddTrackingEventDto): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        orderNumber: true,
        shipment: { select: { id: true } },
      },
    });
    if (!order || !order.shipment) throw new NotFoundException('Đơn hàng hoặc lô hàng không tồn tại');

    const shipmentId = order.shipment.id;

    await prisma.shipmentEvent.create({
      data: {
        shipmentId,
        status: dto.status,
        location: dto.location ?? null,
        description: dto.description,
      },
    });

    if (dto.status === 'DELIVERED') {
      await prisma.shipment.update({ where: { id: shipmentId }, data: { deliveredAt: new Date() } });
      const prev = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
      await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.DELIVERED } });
      if (prev?.status !== OrderStatus.DELIVERED) {
        await this.awardLoyalty(orderId, order.userId, order.orderNumber);
      }
      this.notifRepo
        .createNotification(
          order.userId,
          'Đơn hàng đã được giao',
          `Đơn hàng #${order.orderNumber} đã được giao thành công.`,
          'ORDER_STATUS',
          orderId,
        )
        .catch((err: unknown) => console.error('[AdminService] notification failed', err));
    } else if (dto.status === 'PICKED_UP') {
      await prisma.shipment.update({ where: { id: shipmentId }, data: { shippedAt: new Date() } });
      await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.SHIPPED } });
      this.notifRepo
        .createNotification(
          order.userId,
          'Đơn hàng đang được vận chuyển',
          `Đơn hàng #${order.orderNumber} đang trên đường giao đến bạn.`,
          'ORDER_STATUS',
          orderId,
        )
        .catch((err: unknown) => console.error('[AdminService] notification failed', err));
    }
  }

  listUsers(): Promise<AdminUserItem[]> {
    return this.repo.findAllUsers();
  }

  listCoupons(): Promise<AdminCoupon[]> {
    return this.repo.listCoupons();
  }

  createCoupon(data: { code: string; type: string; value: number; minOrderVnd?: number; maxUses?: number; expiresAt?: string }): Promise<AdminCoupon> {
    return this.repo.createCoupon(data);
  }

  async toggleCoupon(id: string): Promise<AdminCoupon> {
    const coupon = await this.repo.toggleCoupon(id);
    if (!coupon) throw new NotFoundException('Mã giảm giá không tồn tại');
    return coupon;
  }

  getAnalytics(): Promise<AdminAnalytics> {
    return this.repo.getAnalytics();
  }

  async generateProductCopy(dto: GenerateProductCopyDto): Promise<{ description: string; fallback: boolean }> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      return { description: this.buildFallbackProductCopy(dto), fallback: true };
    }

    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.get<string>('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
          instructions: this.buildProductCopyPrompt(),
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: [
                    'Thong tin san pham dang nhap tren admin Lishop:',
                    JSON.stringify(dto, null, 2),
                  ].join('\n'),
                },
              ],
            },
          ],
          max_output_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const payload = await response.json() as { output_text?: string; output?: unknown };
      const description = this.extractOutputText(payload).trim();
      if (!description) throw new Error('OpenAI response did not include text output');

      return { description, fallback: false };
    } catch (err) {
      console.error('[AdminService] AI product copy failed; returning fallback', err);
      return { description: this.buildFallbackProductCopy(dto), fallback: true };
    }
  }

  async importProducts(dto: ImportProductsDto): Promise<{
    created: number;
    failed: number;
    errors: { index: number; name: string; message: string }[];
  }> {
    if (dto.products.length === 0) {
      throw new BadRequestException('Import list must contain at least one product');
    }
    if (dto.products.length > 200) {
      throw new BadRequestException('Import supports at most 200 products per request');
    }

    let created = 0;
    const errors: { index: number; name: string; message: string }[] = [];

    for (const [index, product] of dto.products.entries()) {
      try {
        const categoryId = await this.resolveImportCategory(product);
        const { categorySlug: _categorySlug, ...payload } = product;
        await this.productsService.create({
          ...payload,
          categoryId,
          weightGrams: product.weightGrams ?? 500,
        });
        created += 1;
      } catch (err) {
        errors.push({
          index,
          name: product.name,
          message: err instanceof Error ? err.message : 'Unknown import error',
        });
      }
    }

    return { created, failed: errors.length, errors };
  }

  private async resolveImportCategory(product: ImportProductDto): Promise<string> {
    if (product.categoryId) return product.categoryId;
    if (!product.categorySlug) {
      throw new BadRequestException('categoryId or categorySlug is required');
    }
    const category = await prisma.category.findUnique({
      where: { slug: product.categorySlug },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException(`Category not found: ${product.categorySlug}`);
    }
    return category.id;
  }

  async updateUserRole(userId: string, role: UserRole): Promise<AdminUserItem> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    }) as Promise<AdminUserItem>;
  }

  private buildProductCopyPrompt(): string {
    return [
      'Ban la tro ly AI viet noi dung san pham cho admin Lishop.',
      'Hay viet mo ta san pham bang tieng Viet, 2-4 cau, phu hop san thuong mai dien tu.',
      'Neu co mo ta tho, hay bien no thanh noi dung gon, ro loi ich va de doc.',
      'Khong bia thong so ky thuat, khuyen mai, bao hanh, giao hang, chat lieu, xuat xu hoac cam ket neu du lieu khong co.',
      'Khong dung markdown, khong chen emoji, chi tra ve phan mo ta cuoi cung.',
    ].join('\n');
  }

  private buildFallbackProductCopy(dto: GenerateProductCopyDto): string {
    const parts = [
      dto.name,
      dto.categoryName ? `thuoc danh muc ${dto.categoryName}` : '',
      dto.priceVnd !== undefined ? `co gia ${dto.priceVnd.toLocaleString('vi-VN')} VND` : '',
      dto.stock !== undefined ? `hien con ${dto.stock} san pham trong kho` : '',
    ].filter(Boolean);

    const base = parts.join(', ');
    const rough = dto.description?.trim();
    return rough
      ? `${base}. ${rough}`
      : `${base}. San pham phu hop cho khach hang can mot lua chon de su dung hang ngay, de tham khao va dat mua tai Lishop.`;
  }

  private extractOutputText(payload: { output_text?: string; output?: unknown }): string {
    if (typeof payload.output_text === 'string') return payload.output_text;
    if (!Array.isArray(payload.output)) return '';

    const parts: string[] = [];
    for (const item of payload.output) {
      if (!item || typeof item !== 'object') continue;
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const contentItem of content) {
        if (!contentItem || typeof contentItem !== 'object') continue;
        const text = (contentItem as { text?: unknown }).text;
        if (typeof text === 'string') parts.push(text);
      }
    }
    return parts.join('\n');
  }
}

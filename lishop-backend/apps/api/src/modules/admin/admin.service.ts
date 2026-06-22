import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { AdminRepository, AdminStats, AdminOrderItem, AdminUserItem, AdminCoupon, AdminAnalytics } from './admin.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { RealtimeService } from '../realtime/realtime.service';
import { InvoicesService } from '../invoices/invoices.service';
import { RedisService } from '../redis/redis.service';
import { AddTrackingEventDto } from '../orders/dto/add-tracking-event.dto';
import { OrderStatus, prisma } from '@lishop/database';
import { UserRole } from '@lishop/contracts';
import { ProductsService } from '../products/products.service';
import { ImportProductDto, ImportProductsDto } from './dto/import-products.dto';
import { GenerateProductCopyDto } from './dto/generate-product-copy.dto';
import { AiImportEnrichProductsDto } from './dto/ai-import-enrich-products.dto';
import { generateProductImage as aiGenerateProductImage, downloadAndSaveImage } from '../../common/ai/openai-images';

const STATS_CACHE_KEY = 'cache:admin:stats';
const STATS_TTL = 300; // 5 minutes
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';
const MAX_AI_IMPORT_PRODUCTS = 200;
const IMAGE_GENERATION_TIMEOUT_MS = 60_000;

export interface AiAnalyticsAction {
  title: string;
  rationale: string;
}

export interface AiAnalyticsInsights {
  highlights: string[];
  risks: string[];
  actions: AiAnalyticsAction[];
  questions: string[];
  fallback: boolean;
  /** Present when fallback is true — explains why the AI call did not succeed. */
  fallbackReason?: string;
}

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
    private readonly realtime: RealtimeService,
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

    this.realtime.emitOrderStatusUpdate(orderId, order.userId, {
      orderId,
      orderNumber: order.orderNumber,
      status: status,
      previousStatus: order.status,
      timestamp: new Date().toISOString(),
    });

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

      this.realtime.emitOrderStatusUpdate(orderId, order.userId, {
        orderId,
        orderNumber: order.orderNumber,
        status: OrderStatus.DELIVERED,
        timestamp: new Date().toISOString(),
      });
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

      this.realtime.emitOrderStatusUpdate(orderId, order.userId, {
        orderId,
        orderNumber: order.orderNumber,
        status: OrderStatus.SHIPPED,
        timestamp: new Date().toISOString(),
      });
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

  async generateAnalyticsInsights(options: { rangeDays?: number } = {}): Promise<AiAnalyticsInsights> {
    const analytics = await this.repo.getAnalytics();
    const rangeDays = Number.isFinite(Number(options.rangeDays))
      ? Math.max(1, Math.min(90, Math.round(Number(options.rangeDays))))
      : 30;
    const features = this.buildAnalyticsInsightFeatures(analytics, rangeDays);

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      return { ...this.buildAnalyticsInsightsFallback(analytics, features), fallbackReason: 'OPENAI_API_KEY chưa được cấu hình' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.get<string>('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
          instructions: this.buildAnalyticsInsightsPrompt(),
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: [
                    `Du lieu analytics admin Lishop trong ${rangeDays} ngay:`,
                    JSON.stringify({ analytics, features }, null, 2),
                  ].join('\n'),
                },
              ],
            },
          ],
          max_output_tokens: 2000,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const payload = await response.json() as { output_text?: string; output?: unknown };
      const text = this.extractOutputText(payload).trim();
      if (!text) throw new Error('OpenAI response did not include text output');

      return { ...this.parseAnalyticsInsightsJson(text), fallback: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      console.error('[AdminService] AI analytics insights failed; returning fallback:', message);
      return { ...this.buildAnalyticsInsightsFallback(analytics, features), fallbackReason: message };
    }
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

  async aiImportEnrichProducts(dto: AiImportEnrichProductsDto): Promise<{ products: ImportProductDto[]; fallback: boolean }> {
    const raw = dto.rawText?.trim() ?? '';
    if (!raw) throw new BadRequestException('rawText is required');

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      return { products: this.enrichImportedProducts(this.parseImportTextFallback(raw)), fallback: true };
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
          instructions: this.buildAiImportEnrichPrompt(),
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: [
                    'Du lieu dau vao (CSV/JSON/free text) de tao danh sach san pham:',
                    raw,
                  ].join('\n'),
                },
              ],
            },
          ],
          max_output_tokens: 1500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const payload = await response.json() as { output_text?: string; output?: unknown };
      const text = this.extractOutputText(payload).trim();
      if (!text) throw new Error('OpenAI response did not include text output');

      const parsed = this.safeParseAiProductsJson(text);
      const limited = parsed.slice(0, MAX_AI_IMPORT_PRODUCTS);
      return { products: this.enrichImportedProducts(limited), fallback: false };
    } catch (err) {
      console.error('[AdminService] AI import/enrich failed; returning fallback', err);
      return { products: this.enrichImportedProducts(this.parseImportTextFallback(raw)), fallback: true };
    }
  }

  async generateProductImage(productId: string): Promise<{
    image: { id: string; url: string; alt: string; isPrimary: boolean };
    source: 'unsplash' | 'placeholder';
  }> {
    const product = await this.productsService.findById(productId);

    const openAiApiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!openAiApiKey) {
      throw new BadRequestException('Vui lòng cấu hình OpenAI API key để sử dụng tính năng này');
    }

    const unsplashAccessKey = this.config.get<string>('UNSPLASH_ACCESS_KEY')?.trim() ?? '';

    const result = await aiGenerateProductImage({
      productName: product.name,
      productDescription: product.description,
      categoryName: product.category?.name,
      openAiApiKey,
      unsplashAccessKey,
      requestLabel: 'admin.generateProductImage',
      logger: console,
    });

    let localUrl: string;
    if (result.source === 'unsplash' && result.url) {
      const saveDir = path.resolve(process.cwd(), 'uploads', 'products', productId);
      const filename = await downloadAndSaveImage(result.url, saveDir, randomUUID());
      localUrl = `/uploads/products/${productId}/${filename}`;
    } else {
      // Generate a simple gradient placeholder with product name
      localUrl = await this.generatePlaceholderImage(product.name, productId);
    }

    const hasPrimary = product.images.some((img) => img.isPrimary);
    const image = await prisma.productImage.create({
      data: {
        productId: product.id,
        url: localUrl,
        alt: product.name,
        isPrimary: !hasPrimary,
      },
    });

    return { image: { id: image.id, url: image.url, alt: image.alt ?? product.name, isPrimary: image.isPrimary }, source: result.source };
  }

  private async generatePlaceholderImage(productName: string, productId: string): Promise<string> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#bg)" rx="8"/>
      <text x="200" y="200" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="18" font-family="Arial, sans-serif" font-weight="bold">${this.escapeXml(productName)}</text>
    </svg>`;

    const saveDir = path.resolve(process.cwd(), 'uploads', 'products', productId);
    const fs = await import('fs/promises');
    await fs.mkdir(saveDir, { recursive: true });
    const filename = `${randomUUID()}.svg`;
    await fs.writeFile(`${saveDir}/${filename}`, svg);
    return `/uploads/products/${productId}/${filename}`;
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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
      'Hay viet mo ta san pham bang tieng Viet co dau, 2-4 cau, phu hop san thuong mai dien tu.',
      'Neu co mo ta tho, hay bien no thanh noi dung gon, ro loi ich va de doc.',
      'Khong bia thong so ky thuat, khuyen mai, bao hanh, giao hang, chat lieu, xuat xu hoac cam ket neu du lieu khong co.',
      'Khong dung markdown, khong chen emoji, chi tra ve phan mo ta cuoi cung.',
    ].join('\n');
  }

  private buildAiImportEnrichPrompt(): string {
    return [
      'Ban la tro ly AI cho admin Lishop.',
      'Nhiem vu: tu du lieu CSV/JSON hoac doan van tu do, hay tao danh sach san pham de admin import.',
      'Tra ve DUY NHAT mot JSON object theo schema: {"products":[{...}]} .',
      'Moi san pham bat buoc co: name, description, priceVnd, priceUsd, stock.',
      'Co the co them: sku, weightGrams, categorySlug, imageUrl, imageAlt, tags (mang string).',
      'Neu thieu gia, stock, weight thi suy doan hop ly (gia >= 0, stock >= 0, weightGrams >= 1).',
      'Mo ta (description) viet tieng Viet, 1-3 cau, khong markdown, khong emoji.',
      `Toi da ${MAX_AI_IMPORT_PRODUCTS} san pham.`,
    ].join('\n');
  }

  private buildAnalyticsInsightsPrompt(): string {
    return [
      'Ban la tro ly AI phan tich kinh doanh cho admin Lishop.',
      'Hay doc du lieu analytics va tra ve DUY NHAT mot JSON object hop le.',
      'Schema: {"highlights":["string"],"risks":["string"],"actions":[{"title":"string","rationale":"string"}],"questions":["string"]}.',
      'Tat ca noi dung (highlights, risks, actions, questions) phai viet bang tieng Viet CO DAU, day du dau tieng Viet.',
      'Highlights 3-6 muc, risks 0-3 muc, actions 2-5 muc, questions 0-2 muc.',
      'Chi dua ra nhan dinh dua tren du lieu duoc cung cap. Khong bia doanh thu, ty le, san pham, khuyen mai, kenh marketing.',
      'Actions phai cu the, thuc dung cho admin thuong mai dien tu.',
    ].join('\n');
  }

  private buildImagePrompt(product: { name: string; description?: string; category?: { name: string } }): string {
    const details = [
      `Product name: ${product.name}`,
      product.description ? `Description: ${product.description.slice(0, 300)}` : '',
      product.category?.name ? `Category: ${product.category.name}` : '',
    ].filter(Boolean).join('\n');

    return [
      'You are a professional e-commerce product photographer.',
      'Generate a clean, well-lit product photo suitable for an online store.',
      'The background should be white or neutral, with soft studio lighting.',
      'The product should be centered, clearly visible, and professionally presented.',
      'Product details:',
      details,
      'Style: photorealistic, high quality, centered composition, 4k.',
    ].join('\n');
  }

  private parseAnalyticsInsightsJson(text: string): Omit<AiAnalyticsInsights, 'fallback'> {
    const parsed = JSON.parse(text) as Partial<AiAnalyticsInsights>;
    const highlights = this.toStringList(parsed.highlights).slice(0, 6);
    const risks = this.toStringList(parsed.risks).slice(0, 3);
    const questions = this.toStringList(parsed.questions).slice(0, 2);
    const actions = Array.isArray(parsed.actions)
      ? parsed.actions
          .filter((action): action is AiAnalyticsAction =>
            !!action
            && typeof action === 'object'
            && typeof (action as AiAnalyticsAction).title === 'string'
            && typeof (action as AiAnalyticsAction).rationale === 'string',
          )
          .map((action) => ({ title: action.title.trim(), rationale: action.rationale.trim() }))
          .filter((action) => action.title && action.rationale)
          .slice(0, 5)
      : [];

    if (highlights.length === 0 || actions.length === 0) {
      throw new Error('AI analytics insights schema is incomplete');
    }

    return { highlights, risks, actions, questions };
  }

  private buildAnalyticsInsightFeatures(analytics: AdminAnalytics, rangeDays: number) {
    const sortedRevenue = [...analytics.dailyRevenue].sort((a, b) => a.date.localeCompare(b.date));
    const last7 = sortedRevenue.slice(-7).reduce((sum, item) => sum + item.amount, 0);
    const previous7 = sortedRevenue.slice(-14, -7).reduce((sum, item) => sum + item.amount, 0);
    const trendPercent = previous7 > 0 ? Math.round(((last7 - previous7) / previous7) * 100) : null;
    const topRevenue = analytics.topProducts.reduce((sum, product) => sum + product.revenue, 0);
    const topProductSharePercent = analytics.summary.revenueVnd > 0 && analytics.topProducts[0]
      ? Math.round((analytics.topProducts[0].revenue / analytics.summary.revenueVnd) * 100)
      : 0;
    const cancelledOrRefunded = analytics.orderStatusBreakdown
      .filter((item) => item.status === OrderStatus.CANCELLED || item.status === OrderStatus.REFUNDED)
      .reduce((sum, item) => sum + item.count, 0);
    const issueRatePercent = analytics.summary.orderCount > 0
      ? Math.round((cancelledOrRefunded / analytics.summary.orderCount) * 100)
      : 0;

    return {
      rangeDays,
      last7RevenueVnd: last7,
      previous7RevenueVnd: previous7,
      revenueTrendPercent: trendPercent,
      topRevenueVnd: topRevenue,
      topProductSharePercent,
      lowStockCount: analytics.lowStockProducts.length,
      issueRatePercent,
    };
  }

  private buildAnalyticsInsightsFallback(
    analytics: AdminAnalytics,
    features: ReturnType<AdminService['buildAnalyticsInsightFeatures']>,
  ): AiAnalyticsInsights {
    const highlights = [
      `Doanh thu ${features.rangeDays} ngay dat ${analytics.summary.revenueVnd.toLocaleString('vi-VN')} VND tu ${analytics.summary.orderCount} don hang.`,
      `Gia tri don trung binh la ${analytics.summary.averageOrderValueVnd.toLocaleString('vi-VN')} VND.`,
    ];
    if (features.revenueTrendPercent !== null) {
      highlights.push(
        features.revenueTrendPercent >= 0
          ? `Doanh thu 7 ngay gan nhat tang ${features.revenueTrendPercent}% so voi 7 ngay truoc.`
          : `Doanh thu 7 ngay gan nhat giam ${Math.abs(features.revenueTrendPercent)}% so voi 7 ngay truoc.`,
      );
    }
    if (analytics.topProducts[0]) {
      highlights.push(`San pham doanh thu cao nhat la ${analytics.topProducts[0].productName}.`);
    }

    const risks: string[] = [];
    if (features.lowStockCount > 0) {
      risks.push(`${features.lowStockCount} san pham sap het hang co the lam mat doanh thu.`);
    }
    if (features.topProductSharePercent >= 50) {
      risks.push(`Doanh thu phu thuoc manh vao san pham top 1 (${features.topProductSharePercent}%).`);
    }
    if (features.issueRatePercent >= 20) {
      risks.push(`Ty le don huy/hoan tien dang cao (${features.issueRatePercent}%).`);
    }

    const actions: AiAnalyticsAction[] = [
      {
        title: 'Kiem tra va bo sung ton kho',
        rationale: features.lowStockCount > 0
          ? 'Cac san pham sap het hang nen duoc uu tien nhap them de tranh dut doanh thu.'
          : 'Duy tri ton kho on dinh giup tranh mat co hoi ban hang khi nhu cau tang.',
      },
      {
        title: 'Tang hien thi san pham dang ban tot',
        rationale: analytics.topProducts[0]
          ? `San pham ${analytics.topProducts[0].productName} dang tao doanh thu tot, co the dua vao banner hoac goi y mua kem.`
          : 'Khi co du lieu san pham ban chay, hay dua chung vao khu vuc noi bat.',
      },
    ];
    if (features.revenueTrendPercent !== null && features.revenueTrendPercent < 0) {
      actions.push({
        title: 'Kich hoat chien dich phuc hoi doanh thu',
        rationale: 'Doanh thu 7 ngay gan nhat dang giam, nen thu khuyen mai ngan han hoac remarketing.',
      });
    }
    if (features.issueRatePercent >= 20) {
      actions.push({
        title: 'Ra soat ly do huy va hoan tien',
        rationale: 'Ty le van de don hang cao co the anh huong trai nghiem va loi nhuan.',
      });
    }

    const questions = analytics.summary.orderCount === 0
      ? ['Kenh nao se duoc uu tien de tao don hang dau tien?']
      : ['Nhom san pham nao dang co bien loi nhuan tot nhat?'];

    return { highlights, risks, actions, questions, fallback: true };
  }

  private toStringList(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
      : [];
  }

  private safeParseAiProductsJson(text: string): ImportProductDto[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    // Allow either a raw array or {"products":[...]} for resiliency.
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return parsed as ImportProductDto[];
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { products?: unknown }).products)) {
      return (parsed as { products: ImportProductDto[] }).products;
    }
    throw new Error('AI output JSON schema is invalid');
  }

  private parseImportTextFallback(raw: string): ImportProductDto[] {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    // JSON
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed) as ImportProductDto[] | { products: ImportProductDto[] };
      const products = Array.isArray(parsed) ? parsed : parsed.products;
      return Array.isArray(products) ? products : [];
    }

    // CSV (minimal, matches frontend headers)
    const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = this.splitCsvLine(lines[0]!).map((h) => h.trim());

    return lines.slice(1).map((line) => {
      const values = this.splitCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
      const imageUrl = (row['imageUrl'] ?? '').trim();
      const tags = (row['tags'] ?? '').split('|').map((t) => t.trim()).filter(Boolean);

      const product: ImportProductDto = {
        name: (row['name'] ?? '').trim(),
        ...(row['sku'] ? { sku: String(row['sku']).trim() } : {}),
        description: (row['description'] ?? '').trim(),
        priceVnd: Number(row['priceVnd'] ?? 0),
        priceUsd: Number(row['priceUsd'] ?? 0),
        stock: Number(row['stock'] ?? 0),
        weightGrams: Number(row['weightGrams'] ?? 500),
        ...(row['categoryId'] ? { categoryId: String(row['categoryId']).trim() } : {}),
        ...(row['categorySlug'] ? { categorySlug: String(row['categorySlug']).trim() } : {}),
        ...(imageUrl ? { images: [{ url: imageUrl, alt: String(row['imageAlt'] ?? ''), isPrimary: true }] } : {}),
        ...(tags.length > 0 ? { tags } : {}),
      };

      return product;
    }).filter((p) => p.name);
  }

  private splitCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && quoted && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  private enrichImportedProducts(products: ImportProductDto[]): ImportProductDto[] {
    return products
      .slice(0, MAX_AI_IMPORT_PRODUCTS)
      .filter((p) => !!p && typeof p === 'object' && typeof (p as ImportProductDto).name === 'string')
      .map((p) => {
        const name = p.name.trim();
        const priceVnd = Number.isFinite(Number(p.priceVnd)) ? Number(p.priceVnd) : 0;
        const priceUsd = Number.isFinite(Number(p.priceUsd)) ? Number(p.priceUsd) : 0;
        const stock = Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0;
        const weightGrams = Number.isFinite(Number(p.weightGrams)) ? Number(p.weightGrams) : 500;
        const description = (p.description ?? '').toString().trim();

        const enrichedDescription = description
          ? description
          : this.buildFallbackProductCopy({ name });

        return {
          ...p,
          name,
          priceVnd: Math.max(0, priceVnd),
          priceUsd: Math.max(0, priceUsd),
          stock: Math.max(0, stock),
          weightGrams: Math.max(1, weightGrams),
          description: enrichedDescription,
        };
      });
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

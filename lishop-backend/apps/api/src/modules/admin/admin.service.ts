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
import { AiImportEnrichProductsDto } from './dto/ai-import-enrich-products.dto';

const STATS_CACHE_KEY = 'cache:admin:stats';
const STATS_TTL = 300; // 5 minutes
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';
const MAX_AI_IMPORT_PRODUCTS = 200;

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

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import { RedisService } from '../redis/redis.service';
import { DEFAULT_OPENAI_MODEL, requestOpenAiText } from '../../common/ai/openai-responses';

export type ConciergeActionType = 'ADD_TO_CART' | 'VIEW_PRODUCT' | 'ASK_CLARIFYING_QUESTION';

export interface ConciergeProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceVnd: number;
  stock: number;
  averageRating: number;
  reviewCount: number;
  brand?: string;
  imageUrl: string | null;
}

export interface ConciergeCartItem {
  productId: string;
  name: string;
  slug: string;
  quantity: number;
  priceVnd: number;
  imageUrl: string | null;
  reason: string;
}

export interface ConciergeAction {
  type: ConciergeActionType;
  label: string;
  productId?: string;
}

export interface ShoppingConciergeResponse {
  reply: string;
  items: ConciergeProduct[];
  cartPlan: ConciergeCartItem[];
  actions: ConciergeAction[];
  fallback: boolean;
}

@Injectable()
export class ShoppingConciergeService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async ask(message: string): Promise<ShoppingConciergeResponse> {
    const normalizedMessage = message.trim();
    const result = await this.productsService.findMany({ q: normalizedMessage, limit: 8 });
    const seededProducts = result.items.length > 0 ? result.items : await this.productsService.findFeatured(8);
    const items = seededProducts.map((product) => this.toConciergeProduct(product));
    const cacheKey = `cache:ai:shopping-concierge:${this.normalizeCacheText(normalizedMessage)}`;
    const cached = await this.readCachedJson<Omit<ShoppingConciergeResponse, 'items'>>(cacheKey);
    if (cached) return { ...cached, items };

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      return this.buildFallback(normalizedMessage, items);
    }

    try {
      const text = await requestOpenAiText({
        apiKey,
        model: this.config.get<string>('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
        instructions: this.buildPrompt(),
        inputText: [
          `Yeu cau mua sam cua khach: ${normalizedMessage}`,
          '',
          'San pham ung vien tu catalog Lishop:',
          JSON.stringify(items.map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            priceVnd: item.priceVnd,
            stock: item.stock,
            averageRating: item.averageRating,
            reviewCount: item.reviewCount,
            brand: item.brand,
          })), null, 2),
        ].join('\n'),
        maxOutputTokens: 750,
      });

      const parsed = JSON.parse(text) as Partial<{
        reply: string;
        cartPlan: Array<{ productId: string; quantity?: number; reason?: string }>;
        actions: ConciergeAction[];
      }>;
      const cartPlan = this.resolveCartPlan(parsed.cartPlan, items);
      const actions = this.resolveActions(parsed.actions, cartPlan, items);
      const payload = {
        reply: typeof parsed.reply === 'string' && parsed.reply.trim()
          ? parsed.reply.trim()
          : this.buildDefaultReply(normalizedMessage, cartPlan),
        cartPlan,
        actions,
        fallback: false as const,
      };

      await this.writeCachedJson(cacheKey, payload, 90);
      return { ...payload, items };
    } catch (err) {
      console.error('[ShoppingConciergeService] AI concierge failed; returning fallback', err);
      return this.buildFallback(normalizedMessage, items);
    }
  }

  private buildPrompt(): string {
    return [
      'Ban la AI Shopping Concierge cua Lishop.',
      'Hay tu van mua sam ngan gon, thuc te, dua tren san pham ung vien duoc cung cap.',
      'Chi tra ve JSON hop le, khong markdown, khong giai thich ngoai JSON.',
      'Schema: {"reply":"string","cartPlan":[{"productId":"string","quantity":number,"reason":"string"}],"actions":[{"type":"ADD_TO_CART|VIEW_PRODUCT|ASK_CLARIFYING_QUESTION","label":"string","productId":"string optional"}]}.',
      'cartPlan chi duoc dung productId co trong danh sach ung vien va stock > 0.',
      'Neu action co productId thi productId do phai co trong danh sach ung vien.',
      'Khong tu checkout, khong hua khuyen mai, khong bua gia, stock, giao hang hay uu dai.',
      'Neu yeu cau mo ho, hay tra ve action ASK_CLARIFYING_QUESTION va cartPlan co the rong hoac rat nho.',
    ].join('\n');
  }

  private buildFallback(message: string, items: ConciergeProduct[]): ShoppingConciergeResponse {
    const inStock = items.filter((item) => item.stock > 0);
    const cartPlan = inStock.slice(0, 4).map((item) => this.toCartItem(item, 1, 'Phu hop voi yeu cau mua sam va con hang.'));
    const topNames = cartPlan.slice(0, 3).map((item) => item.name).join(', ');
    return {
      reply: cartPlan.length > 0
        ? `${this.buildDefaultReply(message, cartPlan)} Nen tham khao: ${topNames}.`
        : 'Lishop chua tim thay san pham con hang phu hop. Ban co the mo ta ro hon ve ngan sach, phong cach hoac nhu cau su dung.',
      items,
      cartPlan,
      actions: cartPlan.length > 0
        ? [{ type: 'ADD_TO_CART', label: 'Them goi y vao gio' }]
        : [{ type: 'ASK_CLARIFYING_QUESTION', label: 'Mo ta them nhu cau' }],
      fallback: true,
    };
  }

  private buildDefaultReply(message: string, cartPlan: ConciergeCartItem[]): string {
    return `Minh da goi y ${cartPlan.length} san pham phu hop voi "${message}". Ban hay xem lai truoc khi them vao gio.`;
  }

  private resolveCartPlan(
    rawPlan: Array<{ productId: string; quantity?: number; reason?: string }> | undefined,
    items: ConciergeProduct[],
  ): ConciergeCartItem[] {
    if (!Array.isArray(rawPlan)) return [];
    const byId = new Map(items.map((item) => [item.id, item]));
    const used = new Set<string>();
    const plan: ConciergeCartItem[] = [];

    for (const raw of rawPlan) {
      const product = byId.get(raw.productId);
      if (!product || product.stock <= 0 || used.has(product.id)) continue;
      const quantity = Number.isFinite(Number(raw.quantity))
        ? Math.max(1, Math.min(9, Math.round(Number(raw.quantity))))
        : 1;
      plan.push(this.toCartItem(product, quantity, raw.reason || 'Phu hop voi yeu cau cua ban.'));
      used.add(product.id);
      if (plan.length >= 4) break;
    }

    return plan;
  }

  private resolveActions(
    actions: ConciergeAction[] | undefined,
    cartPlan: ConciergeCartItem[],
    items: ConciergeProduct[],
  ): ConciergeAction[] {
    if (!Array.isArray(actions) || actions.length === 0) {
      return cartPlan.length > 0
        ? [{ type: 'ADD_TO_CART', label: 'Them goi y vao gio' }]
        : [{ type: 'ASK_CLARIFYING_QUESTION', label: 'Mo ta them nhu cau' }];
    }

    const validProductIds = new Set(items.map((item) => item.id));

    return actions
      .filter((action) =>
        action
        && ['ADD_TO_CART', 'VIEW_PRODUCT', 'ASK_CLARIFYING_QUESTION'].includes(action.type)
        && typeof action.label === 'string'
        && action.label.trim().length > 0,
      )
      .filter((action) =>
        action.type !== 'VIEW_PRODUCT'
        || (typeof action.productId === 'string' && validProductIds.has(action.productId)),
      )
      .slice(0, 5)
      .map((action) => ({
        type: action.type,
        label: action.label.trim(),
        ...(action.productId && validProductIds.has(action.productId) ? { productId: action.productId } : {}),
      }));
  }

  private toCartItem(product: ConciergeProduct, quantity: number, reason: string): ConciergeCartItem {
    return {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      quantity,
      priceVnd: product.priceVnd,
      imageUrl: product.imageUrl,
      reason,
    };
  }

  private toConciergeProduct(product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    priceVnd: number;
    stock: number;
    averageRating: number;
    reviewCount: number;
    brand?: string;
    images: { url: string; isPrimary: boolean }[];
  }): ConciergeProduct {
    const primaryImage = product.images.find((image) => image.isPrimary)?.url ?? product.images[0]?.url ?? null;
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceVnd: product.priceVnd,
      stock: product.stock,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
      brand: product.brand,
      imageUrl: primaryImage,
    };
  }

  private normalizeCacheText(value: string) {
    return value.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 120);
  }

  private async readCachedJson<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redisService.get(key);
      return cached ? JSON.parse(cached) as T : null;
    } catch {
      return null;
    }
  }

  private async writeCachedJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redisService.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // ignore cache write failures
    }
  }
}

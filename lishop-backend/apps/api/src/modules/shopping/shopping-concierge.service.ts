import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';

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
  ) {}

  async ask(message: string): Promise<ShoppingConciergeResponse> {
    const normalizedMessage = message.trim();
    const result = await this.productsService.findMany({ q: normalizedMessage, limit: 8 });
    const items = result.items.map((product) => this.toConciergeProduct(product));
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();

    if (!apiKey) {
      return this.buildFallback(normalizedMessage, items);
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
          instructions: this.buildPrompt(),
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: [
                    `Yeu cau mua sam cua khach: ${normalizedMessage}`,
                    '',
                    'San pham ung vien tu catalog Lishop:',
                    JSON.stringify(items, null, 2),
                  ].join('\n'),
                },
              ],
            },
          ],
          max_output_tokens: 750,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const payload = await response.json() as { output_text?: string; output?: unknown };
      const text = this.extractOutputText(payload).trim();
      if (!text) throw new Error('OpenAI response did not include text output');

      const parsed = JSON.parse(text) as Partial<{
        reply: string;
        cartPlan: Array<{ productId: string; quantity?: number; reason?: string }>;
        actions: ConciergeAction[];
      }>;
      const cartPlan = this.resolveCartPlan(parsed.cartPlan, items);
      const actions = this.resolveActions(parsed.actions, cartPlan);

      return {
        reply: typeof parsed.reply === 'string' && parsed.reply.trim()
          ? parsed.reply.trim()
          : this.buildDefaultReply(normalizedMessage, cartPlan),
        items,
        cartPlan,
        actions,
        fallback: false,
      };
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
      'Khong tu checkout, khong hua khuyen mai, khong bia gia, stock, giao hang hay uu dai.',
      'Neu yeu cau mo ho, hay tra ve action ASK_CLARIFYING_QUESTION va cartPlan co the rong hoac rat nho.',
    ].join('\n');
  }

  private buildFallback(message: string, items: ConciergeProduct[]): ShoppingConciergeResponse {
    const inStock = items.filter((item) => item.stock > 0);
    const cartPlan = inStock.slice(0, 4).map((item) => this.toCartItem(item, 1, 'Phu hop voi yeu cau mua sam va con hang.'));
    return {
      reply: cartPlan.length > 0
        ? this.buildDefaultReply(message, cartPlan)
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

  private resolveActions(actions: ConciergeAction[] | undefined, cartPlan: ConciergeCartItem[]): ConciergeAction[] {
    if (!Array.isArray(actions) || actions.length === 0) {
      return cartPlan.length > 0
        ? [{ type: 'ADD_TO_CART', label: 'Them goi y vao gio' }]
        : [{ type: 'ASK_CLARIFYING_QUESTION', label: 'Mo ta them nhu cau' }];
    }

    return actions
      .filter((action) =>
        action
        && ['ADD_TO_CART', 'VIEW_PRODUCT', 'ASK_CLARIFYING_QUESTION'].includes(action.type)
        && typeof action.label === 'string'
        && action.label.trim().length > 0,
      )
      .slice(0, 5)
      .map((action) => ({
        type: action.type,
        label: action.label.trim(),
        ...(action.productId ? { productId: action.productId } : {}),
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

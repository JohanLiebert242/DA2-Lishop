import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductVariant } from '@lishop/database';
import { ProductsService } from '../products/products.service';
import { RedisService } from '../redis/redis.service';
import { DEFAULT_OPENAI_MODEL, requestOpenAiText } from '../../common/ai/openai-responses';

const FIT_VALUES = ['slim', 'regular', 'relaxed', 'oversized'] as const;
const CONFIDENCE_VALUES = ['low', 'medium', 'high'] as const;

export type PreferredFit = typeof FIT_VALUES[number];
export type FitConfidence = typeof CONFIDENCE_VALUES[number];

export interface StyleFitAdvisorRequest {
  productId: string;
  heightCm: number;
  weightKg: number;
  preferredFit: PreferredFit;
  bodyShape?: string;
  occasion?: string;
  notes?: string;
}

export interface StyleFitAdvisorResponse {
  recommendedVariantId?: string;
  recommendedSize?: string;
  confidence: FitConfidence;
  fitSummary: string;
  reasons: string[];
  styleTips: string[];
  warnings: string[];
  fallback: boolean;
}

@Injectable()
export class ShoppingStyleFitAdvisorService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async advise(dto: StyleFitAdvisorRequest): Promise<StyleFitAdvisorResponse> {
    const product = await this.productsService.findById(dto.productId);
    const sizeVariants = product.variants.filter((variant) => this.getSizeValue(variant));
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();

    if (sizeVariants.length === 0) {
      return this.buildFallback(product.name, product.variants, dto);
    }

    if (!apiKey) {
      return this.buildFallback(product.name, product.variants, dto);
    }

    const cacheKey = this.buildCacheKey(dto);
    const cached = await this.readCachedJson<Record<string, unknown>>(cacheKey);
    if (cached) {
      const resolved = this.resolveAiResponse(cached, product.variants, sizeVariants);
      if (resolved) return resolved;
    }

    try {
      const text = await requestOpenAiText({
        apiKey,
        model: this.config.get<string>('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
        instructions: this.buildPrompt(),
        inputText: [
          'Thong tin khach hang:',
          JSON.stringify(this.toShopperContext(dto), null, 2),
          '',
          'San pham va bien the hop le:',
          JSON.stringify({
            id: product.id,
            name: product.name,
            brand: product.brand,
            category: product.category?.name,
            variants: product.variants.map((variant) => ({
              id: variant.id,
              name: variant.name,
              stock: variant.stock,
              size: this.getSizeValue(variant),
              attributes: variant.attributes,
            })),
          }, null, 2),
        ].join('\n'),
        maxOutputTokens: 500,
        requestLabel: 'shopping.style-fit',
        logger: console,
      });

      const parsed = this.parseAdvisorOutput(text);
      const resolved = this.resolveAiResponse(parsed, product.variants, sizeVariants);
      if (!resolved) {
        return this.buildFallback(product.name, product.variants, dto);
      }

      await this.writeCachedJson(cacheKey, parsed, 180);
      return resolved;
    } catch (err) {
      console.error('[ShoppingStyleFitAdvisorService] AI advisor failed; returning fallback', err);
      return this.buildFallback(product.name, product.variants, dto);
    }
  }

  private buildPrompt(): string {
    return [
      'Ban la AI Style/Fit Advisor cua Lishop.',
      'Chi tu van dua tren san pham va bien the duoc cung cap.',
      'Chi duoc recommend recommendedVariantId nam trong danh sach bien the hop le.',
      'fitSummary, reasons, styleTips, warnings phai viet tieng Viet co dau.',
      'Khong dua ra chan doan y te hay dam bao so do tuyet doi.',
      'Chi tra ve JSON hop le, khong markdown, khong giai thich ngoai JSON.',
      'Schema: {"recommendedVariantId":"string optional","recommendedSize":"string optional","confidence":"low|medium|high","fitSummary":"string","reasons":["string"],"styleTips":["string"],"warnings":["string"]}.',
    ].join('\n');
  }

  private toShopperContext(dto: StyleFitAdvisorRequest) {
    return {
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
      preferredFit: dto.preferredFit,
      bodyShape: dto.bodyShape,
      occasion: dto.occasion,
      notes: dto.notes,
    };
  }

  private parseAdvisorOutput(text: string): Record<string, unknown> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('OpenAI response did not include text output');

    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) {
        throw new Error('Could not parse AI JSON output');
      }
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }
  }

  private resolveAiResponse(
    parsed: Record<string, unknown>,
    variants: ProductVariant[],
    sizeVariants: ProductVariant[],
  ): StyleFitAdvisorResponse | null {
    const recommendedVariantId = typeof parsed.recommendedVariantId === 'string'
      ? parsed.recommendedVariantId.trim()
      : undefined;
    const variant = recommendedVariantId
      ? variants.find((item) => item.id === recommendedVariantId)
      : undefined;

    if (recommendedVariantId && !variant) return null;

    const realVariantSize = variant ? this.getSizeValue(variant) : undefined;
    const recommendedSize = realVariantSize
      ?? (typeof parsed.recommendedSize === 'string' ? parsed.recommendedSize.trim() : undefined);
    const confidence = CONFIDENCE_VALUES.includes(parsed.confidence as FitConfidence)
      ? parsed.confidence as FitConfidence
      : 'medium';

    if (sizeVariants.length > 0 && !variant) return null;

    return {
      ...(variant ? { recommendedVariantId: variant.id } : {}),
      ...(recommendedSize ? { recommendedSize } : {}),
      confidence,
      fitSummary: this.cleanString(parsed.fitSummary, 'Minh da xem thong tin san pham va so do de goi y size phu hop.'),
      reasons: this.cleanStringArray(parsed.reasons, ['Goi y dua tren chieu cao, can nang va fit ban chon.']),
      styleTips: this.cleanStringArray(parsed.styleTips, ['Phoi cung phu kien don gian de giu tong the gon gang.']),
      warnings: this.cleanStringArray(parsed.warnings, []),
      fallback: false,
    };
  }

  private buildFallback(
    productName: string,
    variants: ProductVariant[],
    dto: StyleFitAdvisorRequest,
  ): StyleFitAdvisorResponse {
    const variant = this.pickFallbackVariant(variants, dto);
    const size = variant ? this.getSizeValue(variant) : undefined;

    if (!variant) {
      return {
        confidence: 'low',
        fitSummary: `${productName} chua co bien the size ro rang, nen minh chi co the dua ra goi y fit chung.`,
        reasons: ['San pham khong co thuoc tinh size de doi chieu voi so do.'],
        styleTips: ['Chon form theo cach ban muon mac va xem ky mo ta chat lieu truoc khi dat hang.'],
        warnings: ['Khong tim thay size variants cho san pham nay.'],
        fallback: true,
      };
    }

    return {
      recommendedVariantId: variant.id,
      ...(size ? { recommendedSize: size } : {}),
      confidence: 'medium',
      fitSummary: size
        ? `Size ${size} co kha nang phu hop voi chieu cao ${dto.heightCm}cm, can nang ${dto.weightKg}kg va fit ${dto.preferredFit}.`
        : `Bien the ${variant.name} co kha nang phu hop voi thong tin ban cung cap.`,
      reasons: [
        'Goi y duoc tinh bang quy tac fallback dua tren chieu cao, can nang va ton kho.',
        dto.preferredFit === 'relaxed' || dto.preferredFit === 'oversized'
          ? 'Fit rong duoc uu tien tang size khi co bien the phu hop.'
          : 'Fit regular/slim uu tien size gan voi so do co ban.',
      ],
      styleTips: [
        dto.occasion
          ? `Voi dip ${dto.occasion}, hay phoi cung item co mau trung tinh de de can bang tong the.`
          : 'Phoi cung item co mau trung tinh de de can bang tong the.',
      ],
      warnings: variant.stock <= 0 ? ['Size goi y co the dang het hang.'] : [],
      fallback: true,
    };
  }

  private pickFallbackVariant(variants: ProductVariant[], dto: StyleFitAdvisorRequest): ProductVariant | undefined {
    const sized = variants.filter((variant) => this.getSizeValue(variant));
    const inStock = sized.filter((variant) => variant.stock > 0);
    const candidates = inStock.length > 0 ? inStock : sized;
    if (candidates.length === 0) return undefined;

    const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
    const base = dto.heightCm >= 180 || dto.weightKg >= 82
      ? 'XL'
      : dto.heightCm >= 172 || dto.weightKg >= 70
        ? 'L'
        : dto.heightCm >= 162 || dto.weightKg >= 52
          ? 'M'
          : 'S';
    const shift = dto.preferredFit === 'relaxed' ? 1 : dto.preferredFit === 'oversized' ? 2 : 0;
    const targetIndex = Math.min(order.length - 1, Math.max(0, order.indexOf(base) + shift));
    const wanted = order.slice(targetIndex);
    return candidates.find((variant) => wanted.includes(this.getSizeValue(variant)!.toUpperCase()))
      ?? candidates.find((variant) => this.getSizeValue(variant)!.toUpperCase() === base)
      ?? candidates[0];
  }

  private getSizeValue(variant: ProductVariant): string | undefined {
    const attributes = variant.attributes;
    if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return undefined;
    const record = attributes as Record<string, unknown>;
    const value = record.size ?? record.Size;
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private cleanString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private cleanStringArray(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) return fallback;
    const cleaned = value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())
      .slice(0, 6);
    return cleaned.length > 0 ? cleaned : fallback;
  }

  private buildCacheKey(dto: StyleFitAdvisorRequest) {
    return [
      'cache:ai:style-fit',
      dto.productId,
      dto.heightCm,
      dto.weightKg,
      dto.preferredFit,
      dto.bodyShape ?? '-',
      dto.occasion ?? '-',
      dto.notes ?? '-',
    ].join(':').toLowerCase().slice(0, 220);
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

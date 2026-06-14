import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import slugify from 'slugify';
import { ProductsRepository, ProductWithDetails } from './products.repository';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { WishlistService } from '../wishlist/wishlist.service';
import { OrdersService } from '../orders/orders.service';
import { RedisService } from '../redis/redis.service';
import { DEFAULT_OPENAI_MODEL, requestOpenAiText } from '../../common/ai/openai-responses';

export interface AiDiscoveryProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceVnd: number;
  stock: number;
  averageRating: number;
  reviewCount: number;
  brand?: string;
  category: { id: string; name: string; slug: string };
  images: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
}

export interface AiDiscoveryResponse {
  reply: string;
  mode: 'advice' | 'compare';
  items: AiDiscoveryProduct[];
  fallback: boolean;
}

export interface RecommendationsResponse {
  items: AiDiscoveryProduct[];
  reason?: string;
  fallback: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly config: ConfigService,
    private readonly wishlistService: WishlistService,
    private readonly ordersService: OrdersService,
    private readonly redisService: RedisService,
  ) {}

  async findMany(query: ProductListQueryDto): Promise<{ items: ProductWithDetails[]; nextCursor: string | null }> {
    return this.repo.findMany(query);
  }

  async findBySlug(slug: string): Promise<ProductWithDetails> {
    const product = await this.repo.findBySlug(slug);
    if (!product) throw new NotFoundException(`Khong tim thay san pham: ${slug}`);
    return product;
  }

  async findById(id: string): Promise<ProductWithDetails> {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundException(`Khong tim thay san pham: ${id}`);
    return product;
  }

  async findFeatured(limit = 8): Promise<ProductWithDetails[]> {
    return this.repo.findFeatured(limit);
  }

  async findRelated(slug: string, limit = 6): Promise<ProductWithDetails[]> {
    const product = await this.repo.findBySlug(slug);
    if (!product) throw new NotFoundException(`Khong tim thay san pham: ${slug}`);
    const tagIds = product.tags.map((pt) => pt.tagId);
    return this.repo.findRelated(product.id, product.categoryId, tagIds, limit);
  }

  async discoverWithAi(message: string): Promise<AiDiscoveryResponse> {
    const normalizedMessage = message.trim();
    const mode = this.detectDiscoveryMode(normalizedMessage);
    const result = await this.repo.findMany({ q: normalizedMessage, limit: 6 });
    const fallbackProducts = result.items.length > 0 ? result.items : await this.repo.findFeatured(6);
    const items = fallbackProducts.map((product) => this.toAiDiscoveryProduct(product));
    const cacheKey = this.buildDiscoveryCacheKey(mode, normalizedMessage);
    const cached = await this.readCachedJson<Omit<AiDiscoveryResponse, 'items'>>(cacheKey);
    if (cached) return { ...cached, items };

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      return this.discoveryFallback(normalizedMessage, mode, items, true);
    }

    try {
      const reply = await requestOpenAiText({
        apiKey,
        model: this.config.get<string>('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
        instructions: this.buildDiscoveryPrompt(mode),
        inputText: [
          `Nhu cau khach hang: ${normalizedMessage}`,
          '',
          'San pham ung vien tu catalog Lishop:',
          JSON.stringify(items.map((item) => this.toDiscoveryPromptProduct(item)), null, 2),
        ].join('\n'),
        maxOutputTokens: 650,
      });

      const payload = { reply, mode, fallback: false as const };
      await this.writeCachedJson(cacheKey, payload, 90);
      return { ...payload, items };
    } catch (err) {
      console.error('[ProductsService] AI discovery failed; returning fallback', err);
      return this.discoveryFallback(normalizedMessage, mode, items, true);
    }
  }

  async recommendations(params: {
    userId?: string;
    limit?: number;
    context?: string;
  }): Promise<RecommendationsResponse> {
    const limit = params.limit && Number.isFinite(params.limit) ? params.limit : 8;
    const isAuthed = !!params.userId;

    let candidates: AiDiscoveryProduct[] = [];

    if (isAuthed) {
      const wishlistProducts = await this.wishlistService.getWishlistProducts(params.userId!);
      const wishlistSlugs = Array.isArray(wishlistProducts)
        ? wishlistProducts.map((p: any) => p?.slug).filter(Boolean)
        : [];

      const recentOrders = await this.ordersService.findMyOrders(params.userId!);
      const recentOrderSlugs = Array.isArray(recentOrders)
        ? recentOrders.flatMap((o: any) => (o?.items ?? []).map((it: any) => it?.productSlug).filter(Boolean))
        : [];

      const uniqueSlugs = [...wishlistSlugs, ...recentOrderSlugs].filter(
        (s: string, idx: number, arr: string[]) => arr.indexOf(s) === idx,
      );

      if (uniqueSlugs.length >= 1) {
        const primarySlugs = uniqueSlugs.slice(0, Math.max(2, Math.min(6, limit)));
        const primaryProducts = await Promise.all(
          primarySlugs.map(async (slug: string) => {
            const p = await this.repo.findBySlug(slug);
            return p ? this.toAiDiscoveryProduct(p) : null;
          }),
        );

        const primary = primaryProducts.filter(Boolean) as AiDiscoveryProduct[];
        candidates.push(...primary);

        if (primary.length > 0) {
          const primaryFull = await this.repo.findBySlug(primary[0]!.slug);
          if (primaryFull) {
            const related = await this.repo.findRelated(
              primaryFull.id,
              primaryFull.categoryId,
              primaryFull.tags.map((pt) => pt.tagId),
              limit - candidates.length,
            );
            candidates.push(...related.map((p) => this.toAiDiscoveryProduct(p)));
          }
        }
      }
    }

    const dedup = new Map<string, AiDiscoveryProduct>();
    for (const candidate of candidates) dedup.set(candidate.slug, candidate);
    candidates = Array.from(dedup.values());

    if (candidates.length === 0) {
      candidates = (await this.repo.findFeatured(limit)).map((p) => this.toAiDiscoveryProduct(p));
    } else {
      candidates = candidates.slice(0, limit);
    }

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      return { items: candidates.slice(0, limit), fallback: true };
    }

    const cacheKey = this.buildRecommendationsCacheKey(params.userId, params.context, limit);
    const cached = await this.readCachedJson<{ orderedSlugs: string[]; reason?: string }>(cacheKey);
    if (cached) {
      return this.resolveRerankedRecommendations(cached.orderedSlugs, candidates, limit, cached.reason);
    }

    try {
      const reranked = await this.rerankWithAi({
        apiKey,
        limit,
        context: params.context,
        candidates,
      });

      if (!reranked.fallback) {
        await this.writeCachedJson(cacheKey, {
          orderedSlugs: reranked.items.map((item) => item.slug),
          reason: reranked.reason,
        }, 180);
      }

      return reranked;
    } catch (err) {
      console.error('[ProductsService] AI rerank failed; returning fallback', err);
      return { items: candidates.slice(0, limit), fallback: true };
    }
  }

  private async rerankWithAi(params: {
    apiKey: string;
    limit: number;
    context?: string;
    candidates: AiDiscoveryProduct[];
  }): Promise<RecommendationsResponse> {
    const outputText = await requestOpenAiText({
      apiKey: params.apiKey,
      model: this.config.get<string>('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
      instructions: [
        'Ban la tro ly ca nhan hoa mua sam cua Lishop.',
        'Hay sap xep lai cac san pham theo muc do phu hop nhat voi nhu cau cua khach hang dua tren context neu co.',
        'Chi duoc tra ve JSON hop le theo schema: { "orderedSlugs": string[], "reason": string }.',
        'orderedSlugs chi gom cac slug co trong candidate_products.',
        'reason ngan gon trong 1-2 cau.',
      ].join('\n'),
      inputText: [
        `context: ${params.context ?? '(khong co)'}`,
        '',
        'candidate_products:',
        JSON.stringify(params.candidates.map((item) => this.toRecommendationCandidate(item)), null, 2),
      ].join('\n'),
      maxOutputTokens: 250,
    });

    let parsed: any;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      const start = outputText.indexOf('{');
      const end = outputText.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        parsed = JSON.parse(outputText.slice(start, end + 1));
      } else {
        throw new Error('Could not parse AI JSON output');
      }
    }

    if (!parsed || !Array.isArray(parsed.orderedSlugs)) {
      throw new Error('AI JSON missing orderedSlugs');
    }

    return this.resolveRerankedRecommendations(
      parsed.orderedSlugs.filter((slug: unknown) => typeof slug === 'string'),
      params.candidates,
      params.limit,
      typeof parsed.reason === 'string' ? parsed.reason.trim() : undefined,
    );
  }

  async create(dto: CreateProductDto): Promise<ProductWithDetails> {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const { images, tags, variants, categoryId, ...rest } = dto;
    const normalizedVariants = variants?.map((variant, index) => ({
      ...variant,
      weightGrams: variant.weightGrams ?? 500,
      isDefault: variants.some((v) => v.isDefault) ? !!variant.isDefault : index === 0,
      isActive: variant.isActive ?? true,
    }));

    return this.repo.create({
      ...rest,
      slug,
      category: { connect: { id: categoryId } },
      ...(images && {
        images: { create: images.map((img) => ({ url: img.url, alt: img.alt ?? null, isPrimary: img.isPrimary ?? false })) },
      }),
      ...(tags && {
        tags: {
          create: tags.map((tagName) => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName },
              },
            },
          })),
        },
      }),
      ...(normalizedVariants && {
        variants: { create: normalizedVariants },
      }),
    } as any);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductWithDetails> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Khong tim thay san pham: ${id}`);

    const updateData: any = { ...dto };
    delete updateData.images;
    delete updateData.tags;
    delete updateData.variants;
    delete updateData.categoryId;

    if (dto.name) updateData.slug = slugify(dto.name, { lower: true, strict: true });
    if (dto.categoryId) updateData.category = { connect: { id: dto.categoryId } };

    return this.repo.update(id, updateData);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Khong tim thay san pham: ${id}`);
    await this.repo.delete(id);
  }

  private toAiDiscoveryProduct(product: ProductWithDetails): AiDiscoveryProduct {
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
      category: product.category,
      images: product.images,
    };
  }

  private toDiscoveryPromptProduct(item: AiDiscoveryProduct) {
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      priceVnd: item.priceVnd,
      stock: item.stock,
      averageRating: item.averageRating,
      reviewCount: item.reviewCount,
      brand: item.brand,
      category: item.category.name,
    };
  }

  private toRecommendationCandidate(item: AiDiscoveryProduct) {
    return {
      slug: item.slug,
      name: item.name,
      brand: item.brand ?? null,
      category: item.category.name,
      priceVnd: item.priceVnd,
      stock: item.stock,
      averageRating: item.averageRating,
      reviewCount: item.reviewCount,
    };
  }

  private detectDiscoveryMode(message: string): 'advice' | 'compare' {
    const text = this.normalizeText(message);
    return ['so sanh', 'compare', 'khac nhau', 'hon'].some((keyword) => text.includes(keyword))
      ? 'compare'
      : 'advice';
  }

  private discoveryFallback(
    message: string,
    mode: 'advice' | 'compare',
    items: AiDiscoveryProduct[],
    fallback: boolean,
  ): AiDiscoveryResponse {
    const subject = mode === 'compare' ? 'so sanh' : 'tu van';
    const topNames = items.slice(0, 3).map((item) => item.name).join(', ');
    const reply = items.length > 0
      ? `AI chua san sang, nhung Lishop da tim thay ${items.length} san pham phu hop de ${subject} cho yeu cau "${message}": ${topNames}.`
      : 'AI chua san sang va chua tim thay san pham phu hop. Ban co the thu mo ta ro hon ve ngan sach, thuong hieu hoac nhu cau su dung.';
    return { reply, mode, items, fallback };
  }

  private buildDiscoveryPrompt(mode: 'advice' | 'compare'): string {
    return [
      'Ban la tro ly AI tu van mua sam cua Lishop.',
      'Luon tra loi bang tieng Viet tu nhien, ngan gon, thuc te.',
      mode === 'compare'
        ? 'Khach hang muon so sanh san pham. Hay neu diem khac nhau theo gia, danh gia, ton kho, thuong hieu hoac danh muc va goi y san pham nao hop cho nhu cau nao.'
        : 'Khach hang muon duoc tu van san pham. Hay chon san pham phu hop nhat tu du lieu va giai thich ly do.',
      'Chi dung san pham trong du lieu catalog duoc cung cap.',
      'Khong bua gia, ton kho, danh gia, ten san pham, khuyen mai hoac thong so khong co trong du lieu.',
      'Neu du lieu chua du, hay hoi them mot cau ngan ve ngan sach, thuong hieu, hoac nhu cau su dung.',
    ].join('\n');
  }

  private resolveRerankedRecommendations(
    orderedSlugs: string[],
    candidates: AiDiscoveryProduct[],
    limit: number,
    reason?: string,
  ): RecommendationsResponse {
    const candidateSlugs = candidates.map((candidate) => candidate.slug);
    const allowed = new Set(candidateSlugs);
    const safeOrdered = orderedSlugs.filter((slug) => allowed.has(slug));

    if (safeOrdered.length === 0) {
      return { items: candidates.slice(0, limit), fallback: true };
    }

    const fallbackOrdered = candidateSlugs.filter((slug) => !safeOrdered.includes(slug));
    const finalSlugs = [...safeOrdered, ...fallbackOrdered].slice(0, limit);
    const items = finalSlugs
      .map((slug) => candidates.find((candidate) => candidate.slug === slug))
      .filter(Boolean) as AiDiscoveryProduct[];

    return {
      items,
      reason,
      fallback: false,
    };
  }

  private buildDiscoveryCacheKey(mode: 'advice' | 'compare', message: string) {
    return `cache:ai:product-discovery:${mode}:${this.normalizeCacheText(message)}`;
  }

  private buildRecommendationsCacheKey(userId: string | undefined, context: string | undefined, limit: number) {
    return `cache:ai:recommendations:${userId ?? 'guest'}:${this.normalizeCacheText(context ?? '-')}:${limit}`;
  }

  private normalizeCacheText(value: string) {
    return this.normalizeText(value).replace(/\s+/g, '-').slice(0, 120);
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

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }
}

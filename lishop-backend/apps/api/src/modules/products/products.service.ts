import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import slugify from 'slugify';
import { ProductsRepository, ProductWithDetails } from './products.repository';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';

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

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly config: ConfigService,
  ) {}

  async findMany(query: ProductListQueryDto): Promise<{ items: ProductWithDetails[]; nextCursor: string | null }> {
    return this.repo.findMany(query);
  }

  async findBySlug(slug: string): Promise<ProductWithDetails> {
    const product = await this.repo.findBySlug(slug);
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm: ${slug}`);
    return product;
  }

  async findFeatured(limit = 8): Promise<ProductWithDetails[]> {
    return this.repo.findFeatured(limit);
  }

  async findRelated(slug: string, limit = 6): Promise<ProductWithDetails[]> {
    const product = await this.repo.findBySlug(slug);
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm: ${slug}`);
    const tagIds = product.tags.map((pt) => pt.tagId);
    return this.repo.findRelated(product.id, product.categoryId, tagIds, limit);
  }

  async discoverWithAi(message: string): Promise<AiDiscoveryResponse> {
    const normalizedMessage = message.trim();
    const mode = this.detectDiscoveryMode(normalizedMessage);
    const result = await this.repo.findMany({ q: normalizedMessage, limit: 6 });
    const items = result.items.map((product) => this.toAiDiscoveryProduct(product));
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();

    if (!apiKey) {
      return this.discoveryFallback(normalizedMessage, mode, items, true);
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
          instructions: this.buildDiscoveryPrompt(mode),
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: [
                    `Nhu cầu khách hàng: ${normalizedMessage}`,
                    '',
                    'Sản phẩm liên quan từ catalog Lishop dạng JSON:',
                    JSON.stringify(items, null, 2),
                  ].join('\n'),
                },
              ],
            },
          ],
          max_output_tokens: 650,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const payload = await response.json() as { output_text?: string; output?: unknown };
      const reply = this.extractOutputText(payload).trim();
      if (!reply) throw new Error('OpenAI response did not include text output');

      return { reply, mode, items, fallback: false };
    } catch (err) {
      console.error('[ProductsService] AI discovery failed; returning fallback', err);
      return this.discoveryFallback(normalizedMessage, mode, items, true);
    }
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
    if (!existing) throw new NotFoundException(`Không tìm thấy sản phẩm: ${id}`);

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
    if (!existing) throw new NotFoundException(`Không tìm thấy sản phẩm: ${id}`);
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
    const subject = mode === 'compare' ? 'so sánh' : 'tư vấn';
    const reply = items.length > 0
      ? `AI chưa sẵn sàng, nhưng Lishop đã tìm thấy ${items.length} sản phẩm phù hợp để ${subject} cho yêu cầu "${message}".`
      : `AI chưa sẵn sàng và chưa tìm thấy sản phẩm phù hợp. Bạn có thể thử mô tả rõ hơn về ngân sách, thương hiệu hoặc nhu cầu sử dụng.`;
    return { reply, mode, items, fallback };
  }

  private buildDiscoveryPrompt(mode: 'advice' | 'compare'): string {
    return [
      'Bạn là trợ lý AI tư vấn mua sắm của Lishop.',
      'Luôn trả lời bằng tiếng Việt tự nhiên, ngắn gọn, thực tế.',
      mode === 'compare'
        ? 'Khách đang muốn so sánh sản phẩm. Hãy nêu điểm khác nhau theo giá, đánh giá, tồn kho, thương hiệu/danh mục và gợi ý nên chọn sản phẩm nào cho nhu cầu nào.'
        : 'Khách đang muốn được tư vấn sản phẩm. Hãy chọn sản phẩm phù hợp nhất từ dữ liệu và giải thích lý do.',
      'Chỉ dùng sản phẩm trong dữ liệu catalog được cung cấp.',
      'Không bịa giá, tồn kho, đánh giá, tên sản phẩm, khuyến mãi hoặc thông số không có trong dữ liệu.',
      'Nếu dữ liệu chưa đủ, hãy hỏi thêm một câu ngắn về ngân sách, thương hiệu, hoặc nhu cầu sử dụng.',
    ].join('\n');
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

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }
}

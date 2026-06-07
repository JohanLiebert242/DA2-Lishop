import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReviewsRepository, ReviewWithUser, AdminReview } from './reviews.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review, ReviewStatus } from '@lishop/database';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';

export type ReviewModerationRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ReviewModerationAssist {
  suggestedStatus: ReviewStatus;
  riskLevel: ReviewModerationRisk;
  summary: string;
  reasons: string[];
  fallback: boolean;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly repo: ReviewsRepository,
    private readonly config: ConfigService,
  ) {}

  getProductReviews(productId: string): Promise<ReviewWithUser[]> {
    return this.repo.findByProductId(productId);
  }

  async createReview(userId: string, productId: string, dto: CreateReviewDto): Promise<Review> {
    const existing = await this.repo.findByProductIdAndUserId(productId, userId);
    if (existing) throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi');

    const verifiedPurchase = await this.repo.hasDeliveredOrderWithProduct(userId, productId);
    if (!verifiedPurchase) {
      throw new BadRequestException('Bạn chỉ có thể đánh giá sản phẩm đã mua và đã giao thành công');
    }

    const review = await this.repo.create({
      rating: dto.rating,
      content: dto.content ?? '',
      status: ReviewStatus.APPROVED,
      verifiedPurchase,
      product: { connect: { id: productId } },
      user: { connect: { id: userId } },
    });

    await this.repo.refreshProductReviewStats(productId);
    return review;
  }

  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto): Promise<Review> {
    const existing = await this.repo.findById(reviewId);
    if (!existing) throw new NotFoundException(`Review ${reviewId} not found`);
    if (existing.userId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể chỉnh sửa đánh giá của chính mình');
    }

    const updated = await this.repo.updateOwnedReview(userId, reviewId, {
      ...(dto.rating !== undefined && { rating: dto.rating }),
      ...(dto.content !== undefined && { content: dto.content }),
      status: ReviewStatus.APPROVED,
    });

    await this.repo.refreshProductReviewStats(existing.productId);
    return updated;
  }

  findAllForAdmin(status?: ReviewStatus): Promise<AdminReview[]> {
    return this.repo.findAll(status);
  }

  async moderateReview(id: string, status: ReviewStatus): Promise<AdminReview> {
    const existing = await this.repo.findByIdAdmin(id);
    if (!existing) throw new NotFoundException(`Review ${id} not found`);
    return this.repo.moderateReview(id, status);
  }

  async generateModerationAssist(id: string): Promise<ReviewModerationAssist> {
    const review = await this.repo.findByIdAdmin(id);
    if (!review) throw new NotFoundException(`Review ${id} not found`);

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      return this.buildModerationFallback(review);
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
          instructions: this.buildModerationPrompt(),
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: [
                    'Review can kiem duyet tren admin Lishop:',
                    JSON.stringify({
                      id: review.id,
                      productName: review.product.name,
                      rating: review.rating,
                      content: review.content,
                      status: review.status,
                      verifiedPurchase: review.verifiedPurchase,
                      userEmail: review.user.email,
                    }, null, 2),
                  ].join('\n'),
                },
              ],
            },
          ],
          max_output_tokens: 450,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const payload = await response.json() as { output_text?: string; output?: unknown };
      const text = this.extractOutputText(payload).trim();
      if (!text) throw new Error('OpenAI response did not include text output');

      const parsed = JSON.parse(text) as Partial<Omit<ReviewModerationAssist, 'fallback'>>;
      return {
        suggestedStatus: parsed.suggestedStatus === ReviewStatus.REJECTED
          ? ReviewStatus.REJECTED
          : ReviewStatus.APPROVED,
        riskLevel: this.toRiskLevel(parsed.riskLevel),
        summary: typeof parsed.summary === 'string' && parsed.summary.trim()
          ? parsed.summary.trim()
          : 'AI da danh gia noi dung review.',
        reasons: Array.isArray(parsed.reasons) && parsed.reasons.length > 0
          ? parsed.reasons.filter((reason): reason is string => typeof reason === 'string').slice(0, 5)
          : ['AI khong tra ve ly do cu the.'],
        fallback: false,
      };
    } catch (err) {
      console.error('[ReviewsService] AI review moderation failed; returning fallback', err);
      return this.buildModerationFallback(review);
    }
  }

  private buildModerationPrompt(): string {
    return [
      'Ban la tro ly AI ho tro admin Lishop kiem duyet danh gia san pham.',
      'Chi tra ve JSON hop le, khong markdown, khong giai thich ben ngoai JSON.',
      'Schema: {"suggestedStatus":"APPROVED|REJECTED","riskLevel":"LOW|MEDIUM|HIGH","summary":"string","reasons":["string"]}.',
      'Tu choi review co spam, link ngoai, lua dao, quang cao, xuc pham, de doa, noi dung khong lien quan, hoac noi dung khong an toan.',
      'Khong tu choi chi vi review tieu cuc ve chat luong san pham, giao hang, gia ca, kich co, hoac trai nghiem mua hang.',
      'Neu noi dung la feedback san pham binh thuong, ke ca diem thap, hay goi y APPROVED va riskLevel LOW.',
    ].join('\n');
  }

  private buildModerationFallback(review: AdminReview): ReviewModerationAssist {
    const text = this.normalizeText(review.content);
    const riskyRules = [
      { keyword: 'http', reason: 'Noi dung co duong link ben ngoai.' },
      { keyword: 'www.', reason: 'Noi dung co duong link ben ngoai.' },
      { keyword: 'telegram', reason: 'Noi dung co dau hieu dieu huong sang kenh ngoai.' },
      { keyword: 'zalo', reason: 'Noi dung co dau hieu dieu huong sang kenh ngoai.' },
      { keyword: 'mua ngay', reason: 'Noi dung co dau hieu quang cao hoac spam.' },
      { keyword: 'khuyen mai soc', reason: 'Noi dung co dau hieu quang cao hoac spam.' },
      { keyword: 'lua dao', reason: 'Noi dung co ngon ngu rui ro cao can admin kiem tra.' },
      { keyword: 'chet', reason: 'Noi dung co ngon ngu de doa hoac gay hai.' },
    ];
    const reasons = riskyRules
      .filter((rule) => text.includes(rule.keyword))
      .map((rule) => rule.reason);

    if (reasons.length > 0) {
      return {
        suggestedStatus: ReviewStatus.REJECTED,
        riskLevel: 'HIGH',
        summary: `Review ve "${review.product.name}" co dau hieu can tu choi hoac kiem tra ky.`,
        reasons: Array.from(new Set(reasons)).slice(0, 3),
        fallback: true,
      };
    }

    return {
      suggestedStatus: ReviewStatus.APPROVED,
      riskLevel: 'LOW',
      summary: `Review ve "${review.product.name}" co ve la phan hoi san pham binh thuong.`,
      reasons: ['Khong phat hien spam, link ngoai, hoac ngon ngu rui ro cao trong fallback.'],
      fallback: true,
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

  private toRiskLevel(value: unknown): ReviewModerationRisk {
    return value === 'MEDIUM' || value === 'HIGH' ? value : 'LOW';
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }
}

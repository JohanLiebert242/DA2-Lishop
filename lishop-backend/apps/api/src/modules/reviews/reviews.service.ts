import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ReviewsRepository, ReviewWithUser, AdminReview } from './reviews.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review, ReviewStatus } from '@lishop/database';

@Injectable()
export class ReviewsService {
  constructor(private readonly repo: ReviewsRepository) {}

  getProductReviews(productId: string): Promise<ReviewWithUser[]> {
    return this.repo.findByProductId(productId);
  }

  async createReview(userId: string, productId: string, dto: CreateReviewDto): Promise<Review> {
    const existing = await this.repo.findByProductIdAndUserId(productId, userId);
    if (existing) throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi');

    const verifiedPurchase = await this.repo.hasDeliveredOrderWithProduct(userId, productId);

    return this.repo.create({
      rating: dto.rating,
      content: dto.content ?? '',
      status: ReviewStatus.APPROVED,
      verifiedPurchase,
      product: { connect: { id: productId } },
      user: { connect: { id: userId } },
    });
  }

  findAllForAdmin(status?: ReviewStatus): Promise<AdminReview[]> {
    return this.repo.findAll(status);
  }

  async moderateReview(id: string, status: ReviewStatus): Promise<AdminReview> {
    const existing = await this.repo.findByIdAdmin(id);
    if (!existing) throw new NotFoundException(`Review ${id} not found`);
    return this.repo.moderateReview(id, status);
  }
}

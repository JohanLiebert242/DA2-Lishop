import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsRepository } from './reviews.repository';
import { ReviewStatus } from '@lishop/database';

const mockReview: any = {
  id: 'r1',
  userId: 'u1',
  userName: 'Nguyen Van A',
  rating: 5,
  content: 'Tuyệt vời!',
  verifiedPurchase: false,
  createdAt: new Date(),
};

describe('ReviewsService', () => {
  let service: ReviewsService;
  const repo = {
    findByProductId: jest.fn(),
    findByProductIdAndUserId: jest.fn(),
    hasDeliveredOrderWithProduct: jest.fn(),
    create: jest.fn(),
    refreshProductReviewStats: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ReviewsService, { provide: ReviewsRepository, useValue: repo }],
    }).compile();
    service = module.get(ReviewsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getProductReviews returns reviews from repo', async () => {
    repo.findByProductId.mockResolvedValue([mockReview]);
    const result = await service.getProductReviews('p1');
    expect(result).toHaveLength(1);
    expect(repo.findByProductId).toHaveBeenCalledWith('p1');
  });

  it('createReview throws ConflictException when user already reviewed', async () => {
    repo.findByProductIdAndUserId.mockResolvedValue({ id: 'r1' });
    await expect(service.createReview('u1', 'p1', { rating: 5 })).rejects.toThrow(ConflictException);
  });

  it('createReview sets verifiedPurchase=false when no delivered order', async () => {
    repo.findByProductIdAndUserId.mockResolvedValue(null);
    repo.hasDeliveredOrderWithProduct.mockResolvedValue(false);
    repo.create.mockResolvedValue(mockReview);
    await service.createReview('u1', 'p1', { rating: 5 });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ verifiedPurchase: false }));
  });

  it('createReview approves immediately so the new feedback appears publicly', async () => {
    repo.findByProductIdAndUserId.mockResolvedValue(null);
    repo.hasDeliveredOrderWithProduct.mockResolvedValue(false);
    repo.create.mockResolvedValue({ ...mockReview, productId: 'p1' });
    await service.createReview('u1', 'p1', { rating: 5 });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ status: ReviewStatus.APPROVED }));
  });

  it('createReview refreshes product review statistics after creating feedback', async () => {
    repo.findByProductIdAndUserId.mockResolvedValue(null);
    repo.hasDeliveredOrderWithProduct.mockResolvedValue(false);
    repo.create.mockResolvedValue({ ...mockReview, productId: 'p1' });
    await service.createReview('u1', 'p1', { rating: 5 });
    expect(repo.refreshProductReviewStats).toHaveBeenCalledWith('p1');
  });

  it('createReview sets verifiedPurchase=true when user has delivered order', async () => {
    repo.findByProductIdAndUserId.mockResolvedValue(null);
    repo.hasDeliveredOrderWithProduct.mockResolvedValue(true);
    repo.create.mockResolvedValue({ ...mockReview, verifiedPurchase: true });
    await service.createReview('u1', 'p1', { rating: 4, content: 'Good' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ verifiedPurchase: true }));
  });
});

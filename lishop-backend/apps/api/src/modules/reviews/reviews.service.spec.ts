import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  let originalFetch: typeof global.fetch;
  const repo = {
    findByProductId: jest.fn(),
    findByProductIdAndUserId: jest.fn(),
    findById: jest.fn(),
    findByIdAdmin: jest.fn(),
    hasDeliveredOrderWithProduct: jest.fn(),
    create: jest.fn(),
    updateOwnedReview: jest.fn(),
    refreshProductReviewStats: jest.fn(),
  };
  const config = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: ReviewsRepository, useValue: repo },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(ReviewsService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

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

  it('createReview rejects users who have not bought the product', async () => {
    repo.findByProductIdAndUserId.mockResolvedValue(null);
    repo.hasDeliveredOrderWithProduct.mockResolvedValue(false);

    await expect(service.createReview('u1', 'p1', { rating: 5 })).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('createReview approves immediately so the new feedback appears publicly', async () => {
    repo.findByProductIdAndUserId.mockResolvedValue(null);
    repo.hasDeliveredOrderWithProduct.mockResolvedValue(true);
    repo.create.mockResolvedValue({ ...mockReview, productId: 'p1' });
    await service.createReview('u1', 'p1', { rating: 5 });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ status: ReviewStatus.APPROVED }));
  });

  it('createReview refreshes product review statistics after creating feedback', async () => {
    repo.findByProductIdAndUserId.mockResolvedValue(null);
    repo.hasDeliveredOrderWithProduct.mockResolvedValue(true);
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

  it('updateReview allows the owner to edit rating and content', async () => {
    repo.findById.mockResolvedValue({ ...mockReview, productId: 'p1', userId: 'u1' });
    repo.updateOwnedReview.mockResolvedValue({ ...mockReview, rating: 3, content: 'Updated' });

    const result = await service.updateReview('u1', 'r1', { rating: 3, content: 'Updated' });

    expect(result.rating).toBe(3);
    expect(repo.updateOwnedReview).toHaveBeenCalledWith('u1', 'r1', {
      rating: 3,
      content: 'Updated',
      status: ReviewStatus.APPROVED,
    });
    expect(repo.refreshProductReviewStats).toHaveBeenCalledWith('p1');
  });

  it('updateReview rejects edits from another user', async () => {
    repo.findById.mockResolvedValue({ ...mockReview, productId: 'p1', userId: 'other-user' });

    await expect(service.updateReview('u1', 'r1', { rating: 4 })).rejects.toThrow(ForbiddenException);
    expect(repo.updateOwnedReview).not.toHaveBeenCalled();
  });

  describe('generateModerationAssist', () => {
    const adminReview = {
      id: 'r1',
      productId: 'p1',
      userId: 'u1',
      rating: 1,
      content: 'Spam link http://bad.test mua ngay',
      status: ReviewStatus.PENDING,
      verifiedPurchase: false,
      createdAt: new Date('2026-06-06T00:00:00.000Z'),
      product: { name: 'Ao khoac AI', slug: 'ao-khoac-ai' },
      user: { email: 'buyer@lishop.test', firstName: 'Buyer', lastName: 'Test' },
    };

    it('uses OpenAI to suggest a moderation decision', async () => {
      repo.findByIdAdmin.mockResolvedValue(adminReview);
      config.get.mockReturnValue('test-key');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          output_text: JSON.stringify({
            suggestedStatus: 'REJECTED',
            riskLevel: 'HIGH',
            summary: 'Review co dau hieu spam link.',
            reasons: ['Chua duong link ben ngoai', 'Khong tap trung vao san pham'],
          }),
        }),
      });

      const result = await service.generateModerationAssist('r1');

      expect(result).toEqual({
        suggestedStatus: ReviewStatus.REJECTED,
        riskLevel: 'HIGH',
        summary: 'Review co dau hieu spam link.',
        reasons: ['Chua duong link ben ngoai', 'Khong tap trung vao san pham'],
        fallback: false,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/responses',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        }),
      );
    });

    it('returns fallback moderation when OpenAI is not configured', async () => {
      repo.findByIdAdmin.mockResolvedValue(adminReview);
      config.get.mockReturnValue(undefined);

      const result = await service.generateModerationAssist('r1');

      expect(result.fallback).toBe(true);
      expect(result.suggestedStatus).toBe(ReviewStatus.REJECTED);
      expect(result.riskLevel).toBe('HIGH');
      expect(result.reasons.join(' ')).toContain('link');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('falls back when OpenAI returns an error', async () => {
      repo.findByIdAdmin.mockResolvedValue({ ...adminReview, content: 'San pham dep, giao hang nhanh' });
      config.get.mockReturnValue('test-key');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const result = await service.generateModerationAssist('r1');

      expect(result.fallback).toBe(true);
      expect(result.suggestedStatus).toBe(ReviewStatus.APPROVED);
      expect(result.riskLevel).toBe('LOW');
    });

    it('throws NotFoundException when review does not exist', async () => {
      repo.findByIdAdmin.mockResolvedValue(null);

      await expect(service.generateModerationAssist('missing')).rejects.toThrow(NotFoundException);
    });
  });
});

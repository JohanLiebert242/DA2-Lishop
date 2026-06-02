import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CouponType } from '@lishop/database';
import { CouponsRepository } from './coupons.repository';

export interface CouponValidationResult {
  coupon: { id: string; code: string; type: string; value: number };
  discountVnd: number;
}

@Injectable()
export class CouponsService {
  constructor(private readonly repo: CouponsRepository) {}

  async issueHighValueOrderCoupon(userId: string, orderNumber: string) {
    void userId;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const safeOrderNumber = orderNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const uniqueSuffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

    return this.repo.create({
      code: `NEXT10-${safeOrderNumber}-${uniqueSuffix}`,
      type: CouponType.PERCENT,
      value: 10,
      minOrderVnd: 0,
      maxUses: 1,
      usedCount: 0,
      expiresAt,
      isActive: true,
    });
  }

  async validateCoupon(
    code: string,
    userId: string,
    subtotalVnd: number,
  ): Promise<CouponValidationResult> {
    const coupon = await this.repo.findByCode(code);
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Mã giảm giá không hợp lệ');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }
    if (subtotalVnd < coupon.minOrderVnd) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${coupon.minOrderVnd.toLocaleString('vi-VN')}đ để dùng mã này`,
      );
    }
    const hasUsed = await this.repo.hasUsed(coupon.id, userId);
    if (hasUsed) {
      throw new BadRequestException('Bạn đã sử dụng mã giảm giá này rồi');
    }

    const discountVnd = this.calculateDiscount(coupon, subtotalVnd);
    return { coupon, discountVnd };
  }

  async recordUsage(code: string, userId: string): Promise<void> {
    const coupon = await this.repo.findByCode(code);
    if (coupon) await this.repo.recordUsage(coupon.id, userId);
  }

  listPublic() {
    return this.repo.findPublic();
  }

  async tryValidate(
    code: string,
    userId: string,
    subtotalVnd: number,
  ): Promise<CouponValidationResult | null> {
    try {
      return await this.validateCoupon(code, userId, subtotalVnd);
    } catch {
      return null;
    }
  }

  calculateDiscount(coupon: { type: string; value: number }, subtotalVnd: number): number {
    if (coupon.type === CouponType.PERCENT) {
      return Math.floor((subtotalVnd * coupon.value) / 100);
    }
    if (coupon.type === CouponType.FIXED) {
      return Math.min(coupon.value, subtotalVnd);
    }
    return 0;
  }
}

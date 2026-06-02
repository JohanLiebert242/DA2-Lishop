import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { WishlistRepository } from './wishlist.repository';

@Injectable()
export class WishlistService {
  constructor(private readonly repo: WishlistRepository) {}

  async getWishlistIds(userId: string): Promise<{ productIds: string[] }> {
    const productIds = await this.repo.findIdsByUserId(userId);
    return { productIds };
  }

  async getWishlistProducts(userId: string) {
    return this.repo.findProductsByUserId(userId);
  }

  async add(userId: string, productId: string): Promise<void> {
    const exists = await this.repo.exists(userId, productId);
    if (exists) throw new ConflictException('Product is already in wishlist');
    await this.repo.create(userId, productId);
  }

  async remove(userId: string, productId: string): Promise<void> {
    const exists = await this.repo.exists(userId, productId);
    if (!exists) throw new NotFoundException('Product is not in wishlist');
    await this.repo.delete(userId, productId);
  }
}

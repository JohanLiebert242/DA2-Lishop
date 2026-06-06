import { Module } from '@nestjs/common';
import { WishlistRepository } from './wishlist.repository';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';

@Module({
  providers: [WishlistRepository, WishlistService],
  controllers: [WishlistController],
  exports: [WishlistService, WishlistRepository],
})
export class WishlistModule {}

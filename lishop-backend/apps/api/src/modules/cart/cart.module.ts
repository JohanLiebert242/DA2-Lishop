import { Module } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [PromotionsModule],
  providers: [CartRepository, CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}

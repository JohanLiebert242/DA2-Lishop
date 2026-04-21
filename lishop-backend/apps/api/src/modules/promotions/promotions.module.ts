import { Module } from '@nestjs/common';
import { CouponsRepository } from './coupons.repository';
import { CouponsService } from './coupons.service';
import { FlashSalesRepository } from './flash-sales.repository';
import { FlashSalesService } from './flash-sales.service';
import { PromotionsController } from './promotions.controller';

@Module({
  providers: [CouponsRepository, CouponsService, FlashSalesRepository, FlashSalesService],
  controllers: [PromotionsController],
  exports: [CouponsService, FlashSalesService],
})
export class PromotionsModule {}

import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { ShoppingController } from './shopping.controller';
import { ShoppingConciergeService } from './shopping-concierge.service';

@Module({
  imports: [ProductsModule],
  controllers: [ShoppingController],
  providers: [ShoppingConciergeService],
})
export class ShoppingModule {}

import { Module, forwardRef } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SellerProductsController } from './seller-products.controller';
import { CategoriesModule } from '../categories/categories.module';
import { WishlistModule } from '../wishlist/wishlist.module';
import { OrdersModule } from '../orders/orders.module';
import { ShopsModule } from '../shops/shops.module';

@Module({
  imports: [CategoriesModule, WishlistModule, OrdersModule, forwardRef(() => ShopsModule)],
  providers: [ProductsRepository, ProductsService],
  controllers: [ProductsController, SellerProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}

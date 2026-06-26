import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validationPipe } from './common/pipes/validation.pipe';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { CartModule } from './modules/cart/cart.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { SupportModule } from './modules/support/support.module';
import { ShopsModule } from './modules/shops/shops.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { ShoppingModule } from './modules/shopping/shopping.module';
import { ShopChatModule } from './modules/shop-chat/shop-chat.module';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    RedisModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    PromotionsModule,
    CartModule,
    AddressesModule,
    OrdersModule,
    ReviewsModule,
    AdminModule,
    NotificationsModule,
    RealtimeModule,
    WishlistModule,
    ShippingModule,
    InventoryModule,
    ReturnsModule,
    SupportModule,
    ShopsModule,
    PaymentsModule,
    InvoicesModule,
    WalletModule,
    RefundsModule,
    ShoppingModule,
    ShopChatModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_PIPE, useValue: validationPipe },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { SellerOrdersController } from './seller-orders.controller';
import { AddressesModule } from '../addresses/addresses.module';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ShippingModule } from '../shipping/shipping.module';
import { WalletModule } from '../wallet/wallet.module';
import { ShopsModule } from '../shops/shops.module';

@Module({
  imports: [AddressesModule, CartModule, NotificationsModule, PromotionsModule, RealtimeModule, ShippingModule, WalletModule, ShopsModule],
  providers: [OrdersRepository, OrdersService],
  controllers: [OrdersController, SellerOrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}

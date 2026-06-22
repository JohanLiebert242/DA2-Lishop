import { Module } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AddressesModule } from '../addresses/addresses.module';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ShippingModule } from '../shipping/shipping.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [AddressesModule, CartModule, NotificationsModule, PromotionsModule, RealtimeModule, ShippingModule, WalletModule],
  providers: [OrdersRepository, OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}

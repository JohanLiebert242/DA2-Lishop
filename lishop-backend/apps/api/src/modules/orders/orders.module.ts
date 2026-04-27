import { Module } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AddressesModule } from '../addresses/addresses.module';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShippingModule } from '../shipping/shipping.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [AddressesModule, CartModule, NotificationsModule, ShippingModule, WalletModule],
  providers: [OrdersRepository, OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}

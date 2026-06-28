import { Module, forwardRef } from '@nestjs/common';
import { ShopsRepository } from './shops.repository';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { ProductsModule } from '../products/products.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => ProductsModule), NotificationsModule],
  providers: [ShopsRepository, ShopsService],
  controllers: [ShopsController],
  exports: [ShopsService],
})
export class ShopsModule {}

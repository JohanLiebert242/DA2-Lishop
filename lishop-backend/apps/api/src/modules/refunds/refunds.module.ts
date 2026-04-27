import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';
import { RefundsRepository } from './refunds.repository';
import { RefundsService } from './refunds.service';
import { RefundsController } from './refunds.controller';

@Module({
  imports: [WalletModule, NotificationsModule],
  providers: [RefundsRepository, RefundsService],
  controllers: [RefundsController],
  exports: [RefundsService, RefundsRepository],
})
export class RefundsModule {}

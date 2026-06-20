import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletRepository } from './wallet.repository';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [NotificationsModule],
  providers: [WalletRepository, WalletService],
  controllers: [WalletController],
  exports: [WalletService, WalletRepository],
})
export class WalletModule {}

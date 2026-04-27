import { Module } from '@nestjs/common';
import { WalletRepository } from './wallet.repository';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  providers: [WalletRepository, WalletService],
  controllers: [WalletController],
  exports: [WalletService, WalletRepository],
})
export class WalletModule {}

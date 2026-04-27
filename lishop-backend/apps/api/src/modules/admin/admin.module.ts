import { Module } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReturnsModule } from '../returns/returns.module';
import { SupportModule } from '../support/support.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { PaymentsModule } from '../payments/payments.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { RefundsModule } from '../refunds/refunds.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [NotificationsModule, ReturnsModule, SupportModule, ReviewsModule, PromotionsModule, PaymentsModule, InvoicesModule, RefundsModule, WalletModule],
  providers: [AdminRepository, AdminService],
  controllers: [AdminController],
})
export class AdminModule {}

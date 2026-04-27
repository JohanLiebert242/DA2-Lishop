import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RefundsModule } from '../refunds/refunds.module';
import { ReturnsRepository } from './returns.repository';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';

@Module({
  imports: [NotificationsModule, RefundsModule],
  providers: [ReturnsRepository, ReturnsService],
  controllers: [ReturnsController],
  exports: [ReturnsService],
})
export class ReturnsModule {}

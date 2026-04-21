import { Module } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReturnsModule } from '../returns/returns.module';
import { SupportModule } from '../support/support.module';

@Module({
  imports: [NotificationsModule, ReturnsModule, SupportModule],
  providers: [AdminRepository, AdminService],
  controllers: [AdminController],
})
export class AdminModule {}

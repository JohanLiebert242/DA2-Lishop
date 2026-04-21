import { Module } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReturnsModule } from '../returns/returns.module';

@Module({
  imports: [NotificationsModule, ReturnsModule],
  providers: [AdminRepository, AdminService],
  controllers: [AdminController],
})
export class AdminModule {}

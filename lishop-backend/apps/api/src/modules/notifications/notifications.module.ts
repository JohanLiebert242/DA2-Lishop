import { Module } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  providers: [NotificationsRepository, NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}

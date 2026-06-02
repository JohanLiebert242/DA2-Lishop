import { Module } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsStream } from './notifications.stream';

@Module({
  providers: [NotificationsStream, NotificationsRepository, NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsRepository],
})
export class NotificationsModule {}

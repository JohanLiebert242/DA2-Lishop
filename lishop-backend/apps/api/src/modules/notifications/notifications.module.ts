import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsStream } from './notifications.stream';

@Module({
  imports: [RealtimeModule],
  providers: [NotificationsStream, NotificationsRepository, NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsRepository],
})
export class NotificationsModule {}

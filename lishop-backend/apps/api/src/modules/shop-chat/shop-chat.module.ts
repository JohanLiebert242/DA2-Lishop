import { Module } from '@nestjs/common';
import { ShopChatController } from './shop-chat.controller';
import { ShopChatService } from './shop-chat.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  providers: [ShopChatService],
  controllers: [ShopChatController],
  exports: [ShopChatService],
})
export class ShopChatModule {}

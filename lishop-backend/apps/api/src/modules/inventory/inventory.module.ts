import { Module } from '@nestjs/common';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  providers: [InventoryRepository, InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}

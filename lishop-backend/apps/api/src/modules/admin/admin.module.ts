import { Module } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  providers: [AdminRepository, AdminService],
  controllers: [AdminController],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsGatewayService } from './payments.gateway';

@Module({
  providers: [PaymentsRepository, PaymentsService, PaymentsGatewayService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}

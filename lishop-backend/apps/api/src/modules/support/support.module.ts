import { Module } from '@nestjs/common';
import { SupportTicketsRepository } from './support-tickets.repository';
import { SupportTicketsService } from './support-tickets.service';
import { FaqRepository } from './faq.repository';
import { FaqService } from './faq.service';
import { ChatbotService } from './chatbot.service';
import { SupportController } from './support.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [NotificationsModule, ProductsModule],
  providers: [
    SupportTicketsRepository,
    SupportTicketsService,
    FaqRepository,
    FaqService,
    ChatbotService,
  ],
  controllers: [SupportController],
  exports: [SupportTicketsService, FaqService],
})
export class SupportModule {}

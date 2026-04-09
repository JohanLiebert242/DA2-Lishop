import { Module } from '@nestjs/common';
import { ReviewsRepository } from './reviews.repository';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  providers: [ReviewsRepository, ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}

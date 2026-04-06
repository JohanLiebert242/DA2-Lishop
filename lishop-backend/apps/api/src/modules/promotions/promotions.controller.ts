import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FlashSalesService } from './flash-sales.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('promotions')
@Controller('promotions')
@UseGuards(JwtAuthGuard)
export class PromotionsController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Public()
  @Get('flash-sales/active')
  @ApiOperation({ summary: 'Get currently active flash sales' })
  async activeFlashSales() {
    return this.flashSalesService.findActive();
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RefundsService } from './refunds.service';
import { RequestRefundDto } from './dto/request-refund.dto';

@ApiTags('refunds')
@Controller('refunds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my refunds' })
  getUserRefunds(@CurrentUser('id') userId: string) {
    return this.refundsService.getUserRefunds(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Request a refund for a delivered order' })
  createRefund(
    @CurrentUser('id') userId: string,
    @Body(new ValidationPipe()) dto: RequestRefundDto,
  ) {
    return this.refundsService.requestRefund(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single refund' })
  getRefund(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.refundsService.getRefund(userId, id);
  }
}

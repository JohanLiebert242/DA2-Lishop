import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RefundsService } from './refunds.service';

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

  @Get(':id')
  @ApiOperation({ summary: 'Get a single refund' })
  getRefund(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.refundsService.getRefund(userId, id);
  }
}

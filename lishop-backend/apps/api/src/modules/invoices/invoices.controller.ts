import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all invoices for the current user' })
  getUserInvoices(@CurrentUser('id') userId: string) {
    return this.invoicesService.getUserInvoices(userId);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get invoice for a specific order' })
  getInvoiceForOrder(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.invoicesService.getInvoiceForOrder(userId, orderId);
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':orderId')
  @ApiOperation({ summary: 'Get payment status for an order' })
  getPayment(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.paymentsService.getPayment(userId, orderId);
  }

  @Post(':orderId/initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate payment for an order' })
  initiatePayment(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Req() req: { ip: string; headers: Record<string, string> },
  ) {
    const clientIp =
      req.headers['x-forwarded-for'] ?? req.ip ?? '127.0.0.1';
    return this.paymentsService.initiatePayment(userId, orderId, clientIp);
  }

  // ─── VNPAY return (gateway redirect after payment) ────────────────────────

  @Public()
  @Get('vnpay/return')
  @ApiOperation({ summary: 'VNPAY payment return callback' })
  @Redirect()
  async vnpayReturn(@Query() query: Record<string, string>) {
    const returnUrl =
      process.env['VNPAY_RETURN_URL'] ??
      'http://localhost:3004/checkout/payment-result';
    const result = await this.paymentsService.handleVNPayReturn(query);
    return {
      url: `${returnUrl}?success=${result.success}&orderId=${result.orderId}`,
    };
  }

  // ─── MoMo IPN (server-to-server) ─────────────────────────────────────────

  @Public()
  @Post('momo/ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MoMo IPN callback' })
  async momoIpn(@Body() body: Record<string, string | number>) {
    await this.paymentsService.handleMoMoIpn(body);
    return { resultCode: 0 };
  }

  // ─── ZaloPay callback (server-to-server) ─────────────────────────────────

  @Public()
  @Post('zalopay/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ZaloPay payment callback' })
  async zaloPayCallback(@Body() body: { data: string; mac: string }) {
    await this.paymentsService.handleZaloPayCallback(body);
    return { returncode: 1 };
  }
}

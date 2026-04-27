import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TopUpWalletDto } from './dto/topup-wallet.dto';
import { ConvertPointsDto } from './dto/convert-points.dto';

@ApiTags('wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user wallet balance' })
  getWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  getTransactions(@CurrentUser('id') userId: string) {
    return this.walletService.getTransactions(userId);
  }

  @Post('topup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Top up wallet balance' })
  topUp(@CurrentUser('id') userId: string, @Body() dto: TopUpWalletDto) {
    return this.walletService.topUp(userId, dto.amountVnd);
  }

  @Post('convert-points')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert loyalty points to wallet balance (1 point = 100 VND)' })
  convertPoints(@CurrentUser('id') userId: string, @Body() dto: ConvertPointsDto) {
    return this.walletService.convertPoints(userId, dto.points);
  }
}

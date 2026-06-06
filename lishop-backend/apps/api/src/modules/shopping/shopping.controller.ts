import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { Public } from '../auth/decorators/public.decorator';
import { ShoppingConciergeService } from './shopping-concierge.service';

class ShoppingConciergeDto {
  @IsString()
  @MinLength(1)
  message!: string;
}

@ApiTags('shopping')
@Controller('shopping')
export class ShoppingController {
  constructor(private readonly conciergeService: ShoppingConciergeService) {}

  @Public()
  @Post('concierge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI Shopping Concierge recommendations and cart plan' })
  concierge(@Body() dto: ShoppingConciergeDto) {
    return this.conciergeService.ask(dto.message ?? '');
  }
}

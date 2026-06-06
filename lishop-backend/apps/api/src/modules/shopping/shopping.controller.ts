import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { Public } from '../auth/decorators/public.decorator';
import { ShoppingConciergeService } from './shopping-concierge.service';
import { ShoppingStyleFitAdvisorService } from './shopping-style-fit-advisor.service';

class ShoppingConciergeDto {
  @IsString()
  @MinLength(1)
  message!: string;
}

class StyleFitAdvisorDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(80)
  @Max(230)
  heightCm!: number;

  @IsNumber()
  @Min(20)
  @Max(250)
  weightKg!: number;

  @IsIn(['slim', 'regular', 'relaxed', 'oversized'])
  preferredFit!: 'slim' | 'regular' | 'relaxed' | 'oversized';

  @IsOptional()
  @IsString()
  bodyShape?: string;

  @IsOptional()
  @IsString()
  occasion?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('shopping')
@Controller('shopping')
export class ShoppingController {
  constructor(
    private readonly conciergeService: ShoppingConciergeService,
    private readonly styleFitAdvisorService: ShoppingStyleFitAdvisorService,
  ) {}

  @Public()
  @Post('concierge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI Shopping Concierge recommendations and cart plan' })
  concierge(@Body() dto: ShoppingConciergeDto) {
    return this.conciergeService.ask(dto.message ?? '');
  }

  @Public()
  @Post('style-fit-advisor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI Style/Fit Advisor for product variants' })
  styleFitAdvisor(@Body() dto: StyleFitAdvisorDto) {
    return this.styleFitAdvisorService.advise(dto);
  }
}

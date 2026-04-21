import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ShippingService, ShippingOption } from './shipping.service';
import { GetShippingRatesDto } from './dto/get-shipping-rates.dto';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Public()
  @Get('rates')
  getRates(@Query() dto: GetShippingRatesDto): ShippingOption[] {
    const weightGrams = dto.weightGrams ?? 500;
    return this.shippingService.calculateRates(dto.cityName, weightGrams);
  }
}

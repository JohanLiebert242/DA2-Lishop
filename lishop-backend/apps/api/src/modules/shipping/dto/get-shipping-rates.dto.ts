import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetShippingRatesDto {
  @IsString()
  cityName!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weightGrams?: number = 500;
}

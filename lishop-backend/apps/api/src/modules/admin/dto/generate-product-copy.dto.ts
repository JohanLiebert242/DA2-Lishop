import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GenerateProductCopyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceVnd?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  sku?: string;
}

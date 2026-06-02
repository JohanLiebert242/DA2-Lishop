import { IsOptional, IsString, IsInt, IsEnum, IsUUID, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum ProductSortOption {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING_DESC = 'rating_desc',
  NEWEST = 'newest',
}

export class ProductListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) minPriceVnd?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) maxPriceVnd?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) @Type(() => Number) minRating?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === true || value === 'true') inStock?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === true || value === 'true') onSale?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === true || value === 'true') freeShipping?: boolean;
  @ApiPropertyOptional({ enum: ProductSortOption }) @IsOptional() @IsEnum(ProductSortOption) sort?: ProductSortOption;
}

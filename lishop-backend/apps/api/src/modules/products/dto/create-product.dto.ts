import { IsString, IsInt, IsOptional, IsUUID, IsUrl, IsArray, MinLength, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ProductImageInputDto {
  @ApiProperty() @IsUrl() url!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alt?: string;
  @ApiPropertyOptional() @IsOptional() isPrimary?: boolean;
}

export class CreateProductDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255) name!: string;
  @ApiProperty() @IsString() @MinLength(1) description!: string;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceVnd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceUsd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) stock!: number;
  @ApiProperty() @IsUUID() categoryId!: string;
  @ApiPropertyOptional({ type: [ProductImageInputDto] })
  @IsOptional() @IsArray() @Type(() => ProductImageInputDto) images?: ProductImageInputDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

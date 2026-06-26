import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ProductImageInputDto {
  @ApiProperty() @IsString() url!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alt?: string;
  @ApiPropertyOptional() @IsOptional() isPrimary?: boolean;
}

export class ProductVariantInputDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) sku!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255) name!: string;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceVnd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceUsd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) stock!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) weightGrams?: number;
  @ApiProperty() @IsObject() attributes!: Record<string, string>;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateProductDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) sku?: string;
  @ApiProperty() @IsString() @MinLength(1) description!: string;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceVnd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceUsd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) stock!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) weightGrams?: number;
  @ApiProperty() @IsUUID() categoryId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() shopId?: string;
  @ApiPropertyOptional({ type: [ProductImageInputDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductImageInputDto) images?: ProductImageInputDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional({ type: [ProductVariantInputDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductVariantInputDto) variants?: ProductVariantInputDto[];
}

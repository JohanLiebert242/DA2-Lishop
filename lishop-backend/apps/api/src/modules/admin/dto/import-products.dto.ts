import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ImportProductImageDto {
  @ApiProperty() @IsUrl() url!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alt?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class ImportProductVariantDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) sku!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255) name!: string;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceVnd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceUsd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) stock!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) weightGrams?: number;
  @ApiProperty() @IsObject() attributes!: Record<string, string>;
  @ApiPropertyOptional() @IsOptional() @IsUrl() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ImportProductDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) sku?: string;
  @ApiProperty() @IsString() @MinLength(1) description!: string;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceVnd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceUsd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) stock!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) weightGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categorySlug?: string;
  @ApiPropertyOptional({ type: [ImportProductImageDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImportProductImageDto) images?: ImportProductImageDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional({ type: [ImportProductVariantDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImportProductVariantDto) variants?: ImportProductVariantDto[];
}

export class ImportProductsDto {
  @ApiProperty({ type: [ImportProductDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProductDto)
  products!: ImportProductDto[];
}

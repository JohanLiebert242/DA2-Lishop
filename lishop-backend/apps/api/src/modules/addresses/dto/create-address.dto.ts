import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) fullName!: string;
  @ApiProperty() @IsString() @MinLength(7) @MaxLength(20) phone!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255) street!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) district!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) city!: string;
  @ApiPropertyOptional({ default: 'VN' }) @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional({ minimum: -90, maximum: 90 }) @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @ApiPropertyOptional({ minimum: -180, maximum: 180 }) @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

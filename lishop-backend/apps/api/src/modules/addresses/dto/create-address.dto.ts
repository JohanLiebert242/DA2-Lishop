import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) fullName!: string;
  @ApiProperty() @IsString() @MinLength(7) @MaxLength(20) phone!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255) street!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) district!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) city!: string;
  @ApiPropertyOptional({ default: 'VN' }) @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

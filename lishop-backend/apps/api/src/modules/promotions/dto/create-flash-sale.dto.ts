import { IsISO8601, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFlashSaleDto {
  @ApiProperty({ description: 'ISO 8601 start datetime' })
  @IsISO8601()
  startAt!: string;

  @ApiProperty({ description: 'ISO 8601 end datetime' })
  @IsISO8601()
  endAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

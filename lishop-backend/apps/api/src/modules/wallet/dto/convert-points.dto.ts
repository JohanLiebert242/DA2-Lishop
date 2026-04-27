import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConvertPointsDto {
  @ApiProperty({ description: 'Number of loyalty points to convert (minimum 100)', example: 100 })
  @IsInt()
  @Min(100)
  points!: number;
}

import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TopUpWalletDto {
  @ApiProperty({ description: 'Amount in VND to top up (minimum 10,000)', example: 50000 })
  @IsInt()
  @Min(10000)
  amountVnd!: number;

  @ApiProperty({
    description: 'Optional transfer code used in bank transfer content (for client-generated QR flows)',
    example: 'LSW-20260613-ABC123',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  transferCode?: string;
}

import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TopUpWalletDto {
  @ApiProperty({ description: 'Amount in VND to top up (minimum 10,000)', example: 50000 })
  @IsInt()
  @Min(10000)
  amountVnd!: number;
}

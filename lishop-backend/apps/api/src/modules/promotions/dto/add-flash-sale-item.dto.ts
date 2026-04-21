import { IsInt, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddFlashSaleItemDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ minimum: 1, maximum: 99, description: 'Discount percentage' })
  @IsInt()
  @Min(1)
  @Max(99)
  discountPercent!: number;
}

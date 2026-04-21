import { IsUUID, IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, ShippingProvider } from '@lishop/database';

export class PlaceOrderDto {
  @ApiProperty() @IsUUID() addressId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.COD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.COD;

  @ApiPropertyOptional({ enum: ShippingProvider, default: ShippingProvider.GHN })
  @IsEnum(ShippingProvider)
  @IsOptional()
  shippingProvider: ShippingProvider = ShippingProvider.GHN;
}

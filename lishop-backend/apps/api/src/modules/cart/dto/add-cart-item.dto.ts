import { IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @ApiProperty() @IsUUID() productId!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Type(() => Number) quantity!: number;
}

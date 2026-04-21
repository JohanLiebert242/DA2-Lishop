import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReturnReason } from '@lishop/database';

export class ReturnItemDto {
  @IsUUID()
  orderItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateReturnDto {
  @IsUUID()
  orderId!: string;

  @IsEnum(ReturnReason)
  reason!: ReturnReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];
}

import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { RefundMethod } from '@lishop/database';

export class CreateRefundDto {
  @IsUUID()
  orderId!: string;

  @IsInt()
  @Min(1000)
  amountVnd!: number;

  @IsEnum(RefundMethod)
  method!: RefundMethod;

  @IsOptional()
  @IsString()
  reason?: string;
}

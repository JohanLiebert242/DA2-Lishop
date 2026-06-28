import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestRefundDto {
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

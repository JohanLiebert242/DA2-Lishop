import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReturnStatus } from '@lishop/database';

const ALLOWED_ADMIN_STATUSES = [
  ReturnStatus.APPROVED,
  ReturnStatus.REJECTED,
  ReturnStatus.RECEIVED,
  ReturnStatus.COMPLETED,
] as const;

export class UpdateReturnStatusDto {
  @IsEnum(ReturnStatus)
  status!: (typeof ALLOWED_ADMIN_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  adminNote?: string;
}

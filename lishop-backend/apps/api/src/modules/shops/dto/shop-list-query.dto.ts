import { IsOptional, IsString } from 'class-validator';
import { ShopStatus } from '@lishop/database';

export class ShopListQueryDto {
  @IsOptional()
  @IsString()
  status?: ShopStatus;
}

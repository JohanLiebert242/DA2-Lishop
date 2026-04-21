import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, NotEquals } from 'class-validator';

export class AdjustStockDto {
  @IsInt()
  @IsNotEmpty()
  @NotEquals(0)
  delta!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

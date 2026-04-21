import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TicketCategory } from '@lishop/database';

export class CreateTicketDto {
  @IsEnum(TicketCategory)
  category!: TicketCategory;

  @IsString()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  orderRef?: string;
}

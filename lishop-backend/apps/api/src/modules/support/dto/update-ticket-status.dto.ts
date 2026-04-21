import { IsEnum } from 'class-validator';
import { TicketStatus } from '@lishop/database';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}

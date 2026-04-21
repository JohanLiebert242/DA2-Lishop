import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const TRACKING_STATUSES = ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'FAILED'] as const;

export class AddTrackingEventDto {
  @IsString()
  @IsIn(TRACKING_STATUSES)
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsString()
  @MaxLength(300)
  description!: string;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadSupportMediaDto {
  @IsString()
  // data:image/png;base64,...
  @MaxLength(2_000_000)
  dataUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  filename?: string;
}


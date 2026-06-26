import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AiGenerateFaqAnswerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}

import { IsString, MinLength } from 'class-validator';

export class AiImportEnrichProductsDto {
  @IsString()
  @MinLength(1)
  rawText!: string;
}


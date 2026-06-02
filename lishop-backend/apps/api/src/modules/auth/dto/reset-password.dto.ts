import { IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

export class ResetPasswordDto {
  @ApiProperty() @IsString() @MinLength(1) token!: string;
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(STRONG_PASSWORD_REGEX, {
    message: 'Password must include uppercase, lowercase, number, and special character',
  })
  password!: string;
}

import { IsEmail, IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
const NON_BLANK_REGEX = /\S/;

export class RegisterDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(STRONG_PASSWORD_REGEX, {
    message: 'Password must include uppercase, lowercase, number, and special character',
  })
  password!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) @Matches(NON_BLANK_REGEX) firstName!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) @Matches(NON_BLANK_REGEX) lastName!: string;
}

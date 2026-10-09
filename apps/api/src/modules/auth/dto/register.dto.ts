import { IsString, Length } from 'class-validator';
import { IsEmailAddress } from './email.decorator.js';

export class RegisterDto {
  @IsEmailAddress()
  email: string;

  @IsString()
  @Length(10, 128)
  password: string;
}

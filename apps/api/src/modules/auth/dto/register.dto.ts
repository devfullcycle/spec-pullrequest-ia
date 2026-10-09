import { IsEmailAddress } from './email.decorator.js';
import { IsNewPassword } from './new-password.decorator.js';

export class RegisterDto {
  @IsEmailAddress()
  email: string;

  @IsNewPassword()
  password: string;
}

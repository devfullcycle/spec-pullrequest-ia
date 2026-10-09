import { IsEmailAddress } from './email.decorator.js';

export class ForgotPasswordDto {
  @IsEmailAddress()
  email: string;
}

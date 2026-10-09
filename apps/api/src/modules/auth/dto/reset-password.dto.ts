import { IsEmailLinkToken } from './email-link-token.decorator.js';
import { IsNewPassword } from './new-password.decorator.js';

export class ResetPasswordDto {
  @IsEmailLinkToken()
  token: string;

  @IsNewPassword()
  password: string;
}

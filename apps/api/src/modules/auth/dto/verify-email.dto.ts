import { IsEmailLinkToken } from './email-link-token.decorator.js';

export class VerifyEmailDto {
  @IsEmailLinkToken()
  token: string;
}

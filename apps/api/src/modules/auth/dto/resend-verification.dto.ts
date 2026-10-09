import { IsEmailAddress } from './email.decorator.js';

export class ResendVerificationDto {
  @IsEmailAddress()
  email: string;
}

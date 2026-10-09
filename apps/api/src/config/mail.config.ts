import { registerAs } from '@nestjs/config';
import { env } from './env.js';

export const mailConfig = registerAs('mail', () => ({
  smtpUrl: env('SMTP_URL'),
  /** Remetente de todos os e-mails, no formato `Nome <endereço>`. */
  from: env('MAIL_FROM'),
}));

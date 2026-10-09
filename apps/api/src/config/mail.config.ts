import { registerAs } from '@nestjs/config';
import { validatedEnv } from './env.js';

export const mailConfig = registerAs('mail', () => {
  const env = validatedEnv();
  return {
    smtpUrl: env.SMTP_URL,
    /** Remetente de todos os e-mails, no formato `Nome <endereço>`. */
    from: env.MAIL_FROM,
    /** Quanto esperar o servidor de e-mail para abrir a conexão. */
    timeoutMs: env.SMTP_TIMEOUT_MS,
    /** Quanto uma conexão aberta pode ficar sem tráfego antes de ser encerrada. */
    idleTimeoutMs: env.SMTP_IDLE_TIMEOUT_MS,
  };
});

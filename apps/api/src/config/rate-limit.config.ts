import { registerAs } from '@nestjs/config';
import { validatedEnv } from './env.js';

/** Tetos e janelas do limite de tentativas (seção 6 do docs/lld.md). */
export const rateLimitConfig = registerAs('rateLimit', () => {
  const env = validatedEnv();
  return {
    login: {
      perEmail: env.LOGIN_RATE_LIMIT_PER_EMAIL,
      perIp: env.LOGIN_RATE_LIMIT_PER_IP,
      windowSeconds: env.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    },
    /** Cadastro, reenvio de verificação e "esqueci a senha". */
    emailRequest: {
      perEmail: env.EMAIL_REQUEST_RATE_LIMIT_PER_EMAIL,
      perIp: env.EMAIL_REQUEST_RATE_LIMIT_PER_IP,
      windowSeconds: env.EMAIL_REQUEST_RATE_LIMIT_WINDOW_SECONDS,
    },
  };
});

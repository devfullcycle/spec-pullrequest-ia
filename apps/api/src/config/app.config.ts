import { registerAs } from '@nestjs/config';
import { validatedEnv } from './env.js';

export const appConfig = registerAs('app', () => ({
  port: validatedEnv().PORT,
  /** Origem do frontend, de onde saem os links dos e-mails. */
  webOrigin: validatedEnv().WEB_ORIGIN,
  /** Segredo que autoriza a web a repassar o IP do navegador. */
  internalApiSecret: validatedEnv().INTERNAL_API_SECRET,
}));

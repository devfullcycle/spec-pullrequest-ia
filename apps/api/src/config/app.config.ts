import { registerAs } from '@nestjs/config';
import { validatedEnv } from './env.js';

export const appConfig = registerAs('app', () => ({
  port: validatedEnv().PORT,
  /** Origem do frontend, de onde saem os links dos e-mails. */
  webOrigin: validatedEnv().WEB_ORIGIN,
}));

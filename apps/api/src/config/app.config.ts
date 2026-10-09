import { registerAs } from '@nestjs/config';
import { validatedEnv } from './env.js';

export const appConfig = registerAs('app', () => ({
  port: validatedEnv().PORT,
}));

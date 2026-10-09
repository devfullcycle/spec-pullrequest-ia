import { registerAs } from '@nestjs/config';
import { env } from './env.js';

export const appConfig = registerAs('app', () => ({
  port: Number(env('PORT')),
}));

import { registerAs } from '@nestjs/config';
import { env } from './env.js';

export const databaseConfig = registerAs('database', () => ({
  url: env('DATABASE_URL'),
}));

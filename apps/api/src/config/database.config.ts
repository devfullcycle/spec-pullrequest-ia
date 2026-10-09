import { registerAs } from '@nestjs/config';
import { validatedEnv } from './env.js';

export const databaseConfig = registerAs('database', () => ({
  url: validatedEnv().DATABASE_URL,
}));

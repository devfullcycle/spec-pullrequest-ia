import { registerAs } from '@nestjs/config';
import { env } from './env.js';

export const authConfig = registerAs('auth', () => ({
  /** Par de chaves RS256 do token de acesso, em PEM. */
  jwtPrivateKey: env('JWT_PRIVATE_KEY'),
  jwtPublicKey: env('JWT_PUBLIC_KEY'),
}));

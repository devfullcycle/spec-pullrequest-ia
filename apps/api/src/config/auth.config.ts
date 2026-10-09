import { registerAs } from '@nestjs/config';
import { validatedEnv } from './env.js';

export const authConfig = registerAs('auth', () => {
  const env = validatedEnv();
  return {
    /** Par de chaves RS256 do token de acesso, em PEM. */
    jwtPrivateKey: env.JWT_PRIVATE_KEY,
    jwtPublicKey: env.JWT_PUBLIC_KEY,
  };
});

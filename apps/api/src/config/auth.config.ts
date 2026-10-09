import { registerAs } from '@nestjs/config';
import { validatedEnv } from './env.js';

export const authConfig = registerAs('auth', () => {
  const env = validatedEnv();
  return {
    /** Par de chaves RS256 do token de acesso, em PEM. */
    jwtPrivateKey: env.JWT_PRIVATE_KEY,
    jwtPublicKey: env.JWT_PUBLIC_KEY,
    /** Validade do link de verificação de e-mail. */
    emailVerificationTtlSeconds: env.EMAIL_VERIFICATION_TTL_SECONDS,
    /** Validade do link de redefinição de senha. */
    passwordResetTtlSeconds: env.PASSWORD_RESET_TTL_SECONDS,
    /** Validade do token de acesso. */
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    /** Validade do token de renovação. */
    refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL_SECONDS,
    /** Por quanto tempo um token de renovação já trocado ainda é aceito. */
    refreshTokenReuseGraceSeconds: env.REFRESH_TOKEN_REUSE_GRACE_SECONDS,
  };
});

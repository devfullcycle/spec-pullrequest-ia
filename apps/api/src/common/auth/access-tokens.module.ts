import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { createPrivateKey, createPublicKey } from 'node:crypto';
import { authConfig } from '../../config/auth.config.js';
import { AccessTokensService } from './access-tokens.service.js';
import { AuthGuard } from './auth.guard.js';

/** Emite e confere o token de acesso. Quem protege uma rota com o `AuthGuard` importa este módulo. */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      useFactory: (config: ConfigType<typeof authConfig>) => ({
        // As chaves são lidas do PEM uma vez só, e não a cada token.
        privateKey: createPrivateKey(config.jwtPrivateKey),
        publicKey: createPublicKey(config.jwtPublicKey),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: config.accessTokenTtlSeconds,
        },
        // Sem a lista, um token assinado com outro algoritmo poderia ser aceito.
        verifyOptions: { algorithms: ['RS256'] },
      }),
    }),
  ],
  providers: [AccessTokensService, AuthGuard],
  exports: [AccessTokensService, AuthGuard],
})
export class AccessTokensModule {}

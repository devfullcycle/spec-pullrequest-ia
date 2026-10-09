import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { v7 as uuidv7 } from 'uuid';
import { AccessTokensService } from '../../common/auth/access-tokens.service.js';
import { UnauthenticatedError } from '../../common/auth/unauthenticated.error.js';
import { authConfig } from '../../config/auth.config.js';
import { UsersService } from '../users/users.service.js';
import { EmailNotVerifiedError } from './errors/email-not-verified.error.js';
import { InvalidCredentialsError } from './errors/invalid-credentials.error.js';
import { generateOpaqueToken, hashOpaqueToken } from './opaque-token.js';
import { PasswordService } from './password.service.js';
import { RefreshTokensRepository } from './refresh-tokens.repository.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Validade do token de acesso, em segundos. */
  expiresIn: number;
}

/** Sessões: o login de um Usuário em um navegador (seção 4.5 do docs/lld.md). */
@Injectable()
export class SessionsService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly accessTokens: AccessTokensService,
    private readonly refreshTokens: RefreshTokensRepository,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  /** Abre uma Sessão. Não há limite de Sessões por Usuário. */
  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.users.findByEmail(email);
    // A senha é conferida mesmo sem Usuário, para o tempo de resposta não
    // revelar se o e-mail existe.
    const passwordMatches = await this.passwords.verify(
      user?.passwordHash,
      password,
    );
    if (!user || !passwordMatches) {
      throw new InvalidCredentialsError();
    }
    // Só depois da senha: quem não a tem não descobre que o e-mail tem Usuário.
    if (!user.emailVerifiedAt) {
      throw new EmailNotVerifiedError();
    }

    // O token de acesso é assinado antes de a Sessão ser gravada: se a
    // assinatura falhar, não sobra uma Sessão que ninguém recebeu.
    const accessToken = await this.accessTokens.sign(user.id);
    const refreshToken = generateOpaqueToken();
    await this.refreshTokens.create({
      id: uuidv7(),
      userId: user.id,
      sessionId: uuidv7(),
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt: this.refreshTokenExpiry(),
    });
    return this.tokenPair(accessToken, refreshToken);
  }

  /**
   * Troca o token de renovação por um par novo, na mesma Sessão. Um token já
   * trocado ainda é aceito durante a janela de tolerância, para não derrubar
   * quem renova ao mesmo tempo em duas abas. Depois dela, o reuso indica
   * possível roubo e encerra todas as Sessões do Usuário.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashOpaqueToken(refreshToken);
    const current = await this.refreshTokens.findByHash(tokenHash);
    if (!current) {
      throw new UnauthenticatedError();
    }

    // Assinado antes da troca, pelo mesmo motivo do login.
    const accessToken = await this.accessTokens.sign(current.userId);
    const replacement = generateOpaqueToken();
    const now = new Date();
    const outcome = await this.refreshTokens.rotate({
      userId: current.userId,
      tokenHash,
      now,
      reuseAcceptedSince: new Date(
        now.getTime() - this.config.refreshTokenReuseGraceSeconds * 1000,
      ),
      replacement: {
        id: uuidv7(),
        tokenHash: hashOpaqueToken(replacement),
        expiresAt: this.refreshTokenExpiry(),
      },
    });
    if (outcome !== 'rotated') {
      throw new UnauthenticatedError();
    }
    return this.tokenPair(accessToken, replacement);
  }

  /**
   * Encerra a Sessão do token de renovação. As outras Sessões do Usuário
   * continuam. Um token que não existe ou já expirou não é erro.
   */
  logout(refreshToken: string): Promise<void> {
    return this.refreshTokens.deleteSessionOf(hashOpaqueToken(refreshToken));
  }

  private refreshTokenExpiry(): Date {
    return new Date(Date.now() + this.config.refreshTokenTtlSeconds * 1000);
  }

  private tokenPair(accessToken: string, refreshToken: string): TokenPair {
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenTtlSeconds,
    };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { authConfig } from '../../config/auth.config.js';
import { UsersService } from '../users/users.service.js';
import { AuthMailerService } from './auth-mailer.service.js';
import { EmailTokensService } from './email-tokens.service.js';
import { InvalidTokenError } from './errors/invalid-token.error.js';
import { PasswordService } from './password.service.js';
import { SessionsService } from './sessions.service.js';

/** Recuperação de senha (seção 4.7 do docs/lld.md). */
@Injectable()
export class PasswordRecoveryService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly emailTokens: EmailTokensService,
    private readonly mailer: AuthMailerService,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  /**
   * Envia o link de redefinição ao dono do e-mail. Vale também para o Usuário
   * não verificado. Responde igual para um e-mail sem Usuário.
   */
  async requestReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      return;
    }
    const ttlSeconds = this.config.passwordResetTtlSeconds;
    const token = await this.emailTokens.issue(
      user.id,
      'reset_password',
      ttlSeconds,
    );
    this.mailer.sendPasswordReset(user.email, token, ttlSeconds);
  }

  /**
   * Troca a senha de quem tem o link. Quem abriu o link provou que controla a
   * caixa de e-mail, então o Usuário sai verificado. Todas as Sessões são
   * encerradas, para expulsar quem usava a senha antiga, e nenhuma é aberta.
   */
  async reset(token: string, password: string): Promise<void> {
    const user = await this.emailTokens.redeem(
      token,
      'reset_password',
      async (userId) => {
        // Só depois de o token valer: um token inventado não custa um hash.
        const passwordHash = await this.passwords.hash(password);
        // As Sessões saem antes de a senha mudar. Se a troca falhar, a pessoa
        // só precisa entrar de novo e o link volta a valer. Na ordem inversa,
        // uma falha deixaria a senha nova com as Sessões antigas abertas.
        await this.sessions.logoutAll(userId);
        return this.users.resetPassword(userId, passwordHash);
      },
    );
    // O Usuário do token deixou de existir.
    if (!user) {
      throw new InvalidTokenError();
    }
    this.mailer.sendPasswordChanged(user.email);
  }
}

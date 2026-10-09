import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { authConfig } from '../../config/auth.config.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthMailerService } from './auth-mailer.service.js';
import { EmailTokensService } from './email-tokens.service.js';
import { InvalidTokenError } from './errors/invalid-token.error.js';
import { PasswordService } from './password.service.js';
import { SessionsService } from './sessions.service.js';

/** Recuperação de senha (seção 4.7 do docs/lld.md). */
@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);

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
   * não verificado. A resposta sai logo depois da busca do Usuário, que custa
   * o mesmo exista ele ou não: o token e o e-mail seguem sem espera, para o
   * tempo de resposta não revelar se o e-mail tem Usuário. Uma falha ali só
   * vai para o log, e a pessoa pede outro link.
   */
  async requestReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      return;
    }
    this.sendResetLink(user).catch((error: unknown) => {
      this.logger.error(
        'Falha ao emitir o link de redefinição de senha.',
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  private async sendResetLink(user: User): Promise<void> {
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

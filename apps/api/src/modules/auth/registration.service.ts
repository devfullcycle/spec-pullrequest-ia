import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { authConfig } from '../../config/auth.config.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthMailerService } from './auth-mailer.service.js';
import { EmailTokensService } from './email-tokens.service.js';
import { InvalidTokenError } from './errors/invalid-token.error.js';
import { PasswordService } from './password.service.js';

/** Cadastro e verificação de e-mail (seção 4.7 do docs/lld.md). */
@Injectable()
export class RegistrationService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly emailTokens: EmailTokensService,
    private readonly mailer: AuthMailerService,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  /**
   * Nunca revela se o e-mail já tem Usuário: o que muda entre os casos é só o
   * e-mail enviado.
   */
  async register(email: string, password: string): Promise<void> {
    // O hash é calculado em todos os casos, para o tempo de resposta ser o mesmo.
    const passwordHash = await this.passwords.hash(password);

    // A tela de cadastro apresenta os termos, e enviar o formulário é o aceite.
    const registration = { passwordHash, termsAcceptedAt: new Date() };

    const { user, created } = await this.users.findOrCreate({
      email,
      ...registration,
    });
    // Enquanto o e-mail não foi verificado, o último cadastro vence: sem isso,
    // quem cadastrasse primeiro o e-mail de outra pessoa ficaria com a senha de
    // um Usuário que ela verificaria depois.
    const unverified =
      created ||
      (await this.users.replaceUnverifiedRegistration(user.id, registration));

    if (unverified) {
      await this.sendVerification(user);
    } else {
      this.mailer.sendAlreadyRegistered(user.email);
    }
  }

  /** Responde igual para e-mail sem Usuário e para e-mail já verificado. */
  async resendVerification(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user && !user.emailVerifiedAt) {
      await this.sendVerification(user);
    }
  }

  /** Verificar não abre Sessão: a pessoa ainda tem de entrar com a senha. */
  async verifyEmail(token: string): Promise<void> {
    const userId = await this.emailTokens.use(token, 'verify_email');
    if (!userId) {
      throw new InvalidTokenError();
    }
    await this.users.markEmailVerified(userId);
  }

  private async sendVerification(user: User): Promise<void> {
    const ttlSeconds = this.config.emailVerificationTtlSeconds;
    const token = await this.emailTokens.issue(
      user.id,
      'verify_email',
      ttlSeconds,
    );
    this.mailer.sendVerification(user.email, token, ttlSeconds);
  }
}

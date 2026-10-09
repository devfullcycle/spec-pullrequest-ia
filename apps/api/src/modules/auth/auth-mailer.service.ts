import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { appConfig } from '../../config/app.config.js';
import {
  MAIL_SENDER,
  type MailMessage,
  type MailSender,
} from '../../infra/mail/mail-sender.js';
import { formatDuration } from './format-duration.js';

const BRAND = 'Gerenciador de arquivos';

/**
 * Os e-mails da autenticação, em texto simples. O envio é disparado sem
 * espera: a rota responde antes de ele terminar, para o tempo de resposta não
 * revelar se o e-mail tem Usuário. Uma falha só vai para o log.
 */
@Injectable()
export class AuthMailerService {
  private readonly logger = new Logger(AuthMailerService.name);

  constructor(
    @Inject(MAIL_SENDER) private readonly mail: MailSender,
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
  ) {}

  /** `ttlSeconds` é a validade com que o token foi emitido, para o texto dizer a mesma. */
  sendVerification(to: string, token: string, ttlSeconds: number): void {
    const link = `${this.app.webOrigin}/verificar-email?token=${encodeURIComponent(token)}`;
    this.dispatch({
      to,
      subject: 'Confirme seu e-mail',
      text: paragraphs(
        'Olá!',
        'Para ativar sua conta, confirme seu e-mail abrindo o link abaixo:',
        link,
        `O link vale por ${formatDuration(ttlSeconds)} e só pode ser usado uma vez.`,
        'Se você não criou uma conta, ignore este e-mail.',
      ),
    });
  }

  sendAlreadyRegistered(to: string): void {
    this.dispatch({
      to,
      subject: 'Você já tem conta',
      text: paragraphs(
        'Olá!',
        'Alguém tentou criar uma conta com este e-mail, mas você já tem uma.',
        `Para entrar: ${this.app.webOrigin}/entrar`,
        `Se esqueceu a senha, redefina-a aqui: ${this.app.webOrigin}/esqueci-minha-senha`,
        'Se não foi você, ignore este e-mail. Nada mudou na sua conta.',
      ),
    });
  }

  /** `ttlSeconds` é a validade com que o token foi emitido, para o texto dizer a mesma. */
  sendPasswordReset(to: string, token: string, ttlSeconds: number): void {
    const link = `${this.app.webOrigin}/redefinir-senha?token=${encodeURIComponent(token)}`;
    this.dispatch({
      to,
      subject: 'Redefina sua senha',
      text: paragraphs(
        'Olá!',
        'Para definir uma senha nova, abra o link abaixo:',
        link,
        `O link vale por ${formatDuration(ttlSeconds)} e só pode ser usado uma vez.`,
        'Se você não pediu a redefinição, ignore este e-mail. Sua senha continua a mesma.',
      ),
    });
  }

  sendPasswordChanged(to: string): void {
    this.dispatch({
      to,
      subject: 'Sua senha foi alterada',
      text: paragraphs(
        'Olá!',
        'A senha da sua conta foi alterada, e todas as sessões abertas foram encerradas.',
        `Para entrar com a senha nova: ${this.app.webOrigin}/entrar`,
        `Se não foi você, redefina a senha agora: ${this.app.webOrigin}/esqueci-minha-senha`,
      ),
    });
  }

  private dispatch(message: MailMessage): void {
    this.mail.send(message).catch((error: unknown) => {
      // O log não leva o destinatário, que é um dado pessoal.
      this.logger.error(
        `Falha ao enviar o e-mail "${message.subject}".`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }
}

/** Monta o corpo: a marca no topo e um parágrafo por linha em branco. */
function paragraphs(...lines: string[]): string {
  return [BRAND, ...lines].join('\n\n');
}

/** Um e-mail de texto simples. O remetente vem da configuração. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Envio de e-mail, como as regras de negócio o enxergam. O fornecedor fica na
 * implementação, ligada no `MailModule` pelo token `MAIL_SENDER`.
 */
export interface MailSender {
  /** Rejeita se o servidor de e-mail recusar ou não receber a mensagem. */
  send(message: MailMessage): Promise<void>;
}

export const MAIL_SENDER = Symbol('MAIL_SENDER');

import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { mailConfig } from '../../config/mail.config.js';
import { MailMessage, MailSender } from './mail-sender.js';

/** Driver SMTP do envio de e-mail. No ambiente local, o servidor é o Mailpit. */
@Injectable()
export class SmtpMailSender implements MailSender, OnModuleDestroy {
  private readonly transporter: Transporter;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly config: ConfigType<typeof mailConfig>,
  ) {
    // Os prazos padrão do nodemailer vão de 30 segundos (DNS) a minutos (2 para
    // conectar, 10 de inatividade). Um servidor travado seguraria o envio por
    // todo esse tempo.
    this.transporter = createTransport({
      url: config.smtpUrl,
      // Reaproveita a conexão entre um envio e outro, em vez de refazer a
      // negociação com o servidor a cada e-mail.
      pool: true,
      dnsTimeout: config.timeoutMs,
      connectionTimeout: config.timeoutMs,
      greetingTimeout: config.timeoutMs,
      // A inatividade tem prazo próprio e maior: ele vale durante o envio, para
      // um servidor lento em responder, e entre um envio e outro, para a
      // conexão do pool não ser derrubada antes de ser reaproveitada.
      socketTimeout: config.idleTimeoutMs,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }

  onModuleDestroy(): void {
    this.transporter.close();
  }
}

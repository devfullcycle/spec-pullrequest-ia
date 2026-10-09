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
    this.transporter = createTransport(config.smtpUrl);
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

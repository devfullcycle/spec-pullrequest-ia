import { Test, TestingModule } from '@nestjs/testing';
import { uniqueEmail, waitForMailTo } from '../../../test/support/mailpit.js';
import { AppConfigModule } from '../../config/config.module.js';
import { MAIL_SENDER, MailSender } from './mail-sender.js';
import { MailModule } from './mail.module.js';

describe('Envio de e-mail por SMTP', () => {
  let moduleRef: TestingModule;
  let mailSender: MailSender;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule.forRoot(), MailModule],
    }).compile();
    mailSender = moduleRef.get<MailSender>(MAIL_SENDER);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('entrega no Mailpit o e-mail enviado pela interface', async () => {
    const to = uniqueEmail();

    await mailSender.send({
      to,
      subject: 'Confirme seu e-mail',
      text: 'Olá!\n\nAbra o link para confirmar: http://web:3000/verificar?token=abc123\n',
    });

    const mail = await waitForMailTo(to);
    expect(mail.subject).toBe('Confirme seu e-mail');
    expect(mail.text).toContain('http://web:3000/verificar?token=abc123');
    expect(mail.to).toEqual([to]);
  });

  it('usa o remetente configurado em MAIL_FROM', async () => {
    const to = uniqueEmail();

    await mailSender.send({ to, subject: 'Remetente', text: 'Corpo' });

    const mail = await waitForMailTo(to);
    expect(process.env.MAIL_FROM).toContain(`<${mail.from}>`);
  });

  it('manda só texto simples, sem versão em HTML', async () => {
    const to = uniqueEmail();

    await mailSender.send({ to, subject: 'Texto', text: 'Só texto' });

    const mail = await waitForMailTo(to);
    expect(mail.html).toBe('');
  });
});

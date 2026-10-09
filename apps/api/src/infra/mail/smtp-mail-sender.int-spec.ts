import { Test, TestingModule } from '@nestjs/testing';
import { AddressInfo, createServer, Socket } from 'node:net';
import { uniqueEmail, waitForMailTo } from '../../../test/support/mailpit.js';
import { AppConfigModule } from '../../config/config.module.js';
import { mailConfig } from '../../config/mail.config.js';
import { MAIL_SENDER, MailSender } from './mail-sender.js';
import { MailModule } from './mail.module.js';

function bootMail(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [AppConfigModule.forRoot(), MailModule],
  }).compile();
}

describe('Envio de e-mail por SMTP', () => {
  let moduleRef: TestingModule;
  let mailSender: MailSender;

  beforeAll(async () => {
    moduleRef = await bootMail();
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
    const { from } = moduleRef.get(mailConfig.KEY);
    expect(from).toContain(`<${mail.from}>`);
  });

  it('manda só texto simples, sem versão em HTML', async () => {
    const to = uniqueEmail();

    await mailSender.send({ to, subject: 'Texto', text: 'Só texto' });

    const mail = await waitForMailTo(to);
    expect(mail.html).toBe('');
  });

  it('deixa ler o e-mail mais novo quando o mesmo destinatário recebe outro', async () => {
    const to = uniqueEmail();

    await mailSender.send({ to, subject: 'Primeiro', text: 'Link antigo' });
    const first = await waitForMailTo(to);
    await mailSender.send({ to, subject: 'Segundo', text: 'Link novo' });
    const second = await waitForMailTo(to, { count: 2 });

    expect(first.subject).toBe('Primeiro');
    expect(second.subject).toBe('Segundo');
    expect(second.text).toContain('Link novo');
  });

  it('não se contenta com o primeiro e-mail enquanto o teste espera o segundo', async () => {
    const to = uniqueEmail();
    await mailSender.send({ to, subject: 'Primeiro', text: 'Link antigo' });

    await expect(
      waitForMailTo(to, { count: 2, timeoutMs: 300 }),
    ).rejects.toThrow(/recebeu 1 e-mail\(s\) .* esperava 2/);
  });

  it('desiste, no prazo de SMTP_TIMEOUT_MS, de um servidor que aceita a conexão e não responde', async () => {
    // Um servidor mudo neste mesmo contêiner: é o único jeito de provocar a
    // espera, e por isso o host é o endereço local, e não um serviço do Compose.
    const sockets: Socket[] = [];
    const silentServer = createServer((socket) => sockets.push(socket));
    await new Promise<void>((resolve) =>
      silentServer.listen(0, '127.0.0.1', resolve),
    );
    const { port } = silentServer.address() as AddressInfo;
    vi.stubEnv('SMTP_URL', `smtp://127.0.0.1:${port}`);
    vi.stubEnv('SMTP_TIMEOUT_MS', '300');
    const moduleWithSilentServer = await bootMail();

    try {
      const startedAt = Date.now();
      await expect(
        moduleWithSilentServer
          .get<MailSender>(MAIL_SENDER)
          .send({ to: uniqueEmail(), subject: 'Sem resposta', text: 'Corpo' }),
      ).rejects.toThrow();
      expect(Date.now() - startedAt).toBeLessThan(3000);
    } finally {
      await moduleWithSilentServer.close();
      sockets.forEach((socket) => socket.destroy());
      silentServer.close();
    }
  }, 8000);
});

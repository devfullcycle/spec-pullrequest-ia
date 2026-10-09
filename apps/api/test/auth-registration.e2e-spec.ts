import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { appConfig } from '../src/config/app.config.js';
import { createTestApp } from './support/create-test-app.js';
import {
  CapturedMail,
  countMailTo,
  readAllMailTo,
  uniqueEmail,
  waitForMailTo,
} from './support/mailpit.js';
import { expectProblem } from './support/problem.js';

const PASSWORD = 'uma senha bem longa';

const VERIFICATION_SUBJECT = 'Confirme seu e-mail';
const ALREADY_REGISTERED_SUBJECT = 'Você já tem conta';

/** O token do link de verificação que o e-mail traz. */
function verificationToken(mail: CapturedMail): string {
  const link = /https?:\/\/\S+\/verificar-email\?token=\S+/.exec(mail.text);
  if (!link) {
    throw new Error(`O e-mail "${mail.subject}" não traz link de verificação.`);
  }
  return new URL(link[0]).searchParams.get('token') ?? '';
}

/** As chamadas do cadastro e da verificação, contra uma aplicação de teste. */
function authRoutes(app: INestApplication<App>) {
  const post = (route: string, body: object) =>
    request(app.getHttpServer()).post(`/v1/auth/${route}`).send(body);

  const register = (email: string, password = PASSWORD) =>
    post('register', { email, password });
  const verifyEmail = (token: string) => post('verify-email', { token });
  const resendVerification = (email: string) =>
    post('resend-verification', { email });

  /** Cadastra o e-mail e devolve o token do link de verificação que chegou. */
  const registerAndGetToken = async (email: string) => {
    await register(email).expect(201);
    return verificationToken(await waitForMailTo(email));
  };

  return {
    register,
    verifyEmail,
    resendVerification,
    registerAndGetToken,
    /** Deixa o e-mail com um Usuário já verificado. */
    registerVerified: async (email: string) => {
      await verifyEmail(await registerAndGetToken(email)).expect(204);
    },
    expectInvalidToken: async (token: string) => {
      expectProblem(await verifyEmail(token).expect(400), {
        title: 'Bad Request',
        status: 400,
        code: 'invalid_token',
        detail: expect.any(String),
      });
    },
  };
}

describe('Cadastro e verificação de e-mail', () => {
  let app: INestApplication<App>;
  let auth: ReturnType<typeof authRoutes>;

  beforeAll(async () => {
    app = await createTestApp();
    auth = authRoutes(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('cadastro de um e-mail novo', () => {
    it('responde 201 sem corpo e envia o e-mail de verificação, com o link para a web', async () => {
      const email = uniqueEmail();

      await auth.register(email).expect(201, {});

      const mail = await waitForMailTo(email);
      expect(mail.subject).toBe(VERIFICATION_SUBJECT);
      expect(mail.text).toContain(
        `${app.get(appConfig.KEY).webOrigin}/verificar-email?token=`,
      );
      expect(verificationToken(mail)).not.toBe('');
    });
  });

  describe('cadastro de um e-mail já cadastrado e não verificado', () => {
    it('responde 201, envia nova verificação e invalida o link anterior', async () => {
      const email = uniqueEmail();
      const firstToken = await auth.registerAndGetToken(email);

      await auth.register(email, 'outra senha bem longa').expect(201, {});

      const secondMail = await waitForMailTo(email, { count: 2 });
      expect(secondMail.subject).toBe(VERIFICATION_SUBJECT);
      const secondToken = verificationToken(secondMail);
      expect(secondToken).not.toBe(firstToken);
      await auth.expectInvalidToken(firstToken);
      await auth.verifyEmail(secondToken).expect(204);
    });

    // A senha só é observável pelo login, que chega com o ticket de entrar e sair.
    it.todo('faz a senha nova valer no lugar da anterior');
  });

  describe('cadastro de um e-mail já cadastrado e verificado', () => {
    it('responde 201 e envia o e-mail "você já tem conta", sem link de verificação', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);

      await auth.register(email, 'outra senha bem longa').expect(201, {});

      const mail = await waitForMailTo(email, { count: 2 });
      const { webOrigin } = app.get(appConfig.KEY);
      expect(mail.subject).toBe(ALREADY_REGISTERED_SUBJECT);
      expect(mail.text).toContain(`${webOrigin}/entrar`);
      expect(mail.text).toContain(`${webOrigin}/esqueci-minha-senha`);
      expect(mail.text).not.toContain('/verificar-email');
    });

    // A senha só é observável pelo login, que chega com o ticket de entrar e sair.
    it.todo('mantém a senha anterior');
  });

  describe('e-mail do cadastro', () => {
    it('trata como o mesmo Usuário o e-mail com maiúsculas e espaços nas pontas', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);

      await auth.register(`  ${email.toUpperCase()}  `).expect(201);

      // Se fosse outro Usuário, chegaria uma verificação, e não este aviso.
      const mail = await waitForMailTo(email, { count: 2 });
      expect(mail.subject).toBe(ALREADY_REGISTERED_SUBJECT);
    });

    it('trata como outro Usuário o endereço com +', async () => {
      const email = uniqueEmail();
      const plusEmail = email.replace('@', '+outro@');
      await auth.registerVerified(email);

      await auth.register(plusEmail).expect(201);

      const mail = await waitForMailTo(plusEmail);
      expect(mail.subject).toBe(VERIFICATION_SUBJECT);
      expect(await countMailTo(email)).toBe(1);
    });
  });

  describe('entrada inválida no cadastro', () => {
    it.each([
      ['com 9 caracteres', 'a'.repeat(9)],
      ['com 129 caracteres', 'a'.repeat(129)],
    ])('recusa a senha %s com validation_error', async (_case, password) => {
      const email = uniqueEmail();

      const response = await auth.register(email, password).expect(400);

      expectProblem(response, {
        title: 'Bad Request',
        status: 400,
        code: 'validation_error',
        detail: expect.any(String),
        errors: [{ field: 'password', messages: expect.any(Array) }],
      });
    });

    it.each([
      ['com 10 caracteres', 'a'.repeat(10)],
      ['com 128 caracteres', 'a'.repeat(128)],
      ['sem letra maiúscula, número nem símbolo', 'so letras minusculas'],
    ])('aceita a senha %s', async (_case, password) => {
      await auth.register(uniqueEmail(), password).expect(201);
    });

    it('recusa um e-mail malformado com validation_error', async () => {
      const response = await auth.register('nome@exemplo').expect(400);

      expect(response.body.code).toBe('validation_error');
      expect(response.body.errors).toEqual([
        { field: 'email', messages: expect.any(Array) },
      ]);
    });
  });

  describe('reenvio da verificação', () => {
    it('responde 204, emite um link novo e invalida o anterior', async () => {
      const email = uniqueEmail();
      const firstToken = await auth.registerAndGetToken(email);

      await auth.resendVerification(email).expect(204, {});

      const secondMail = await waitForMailTo(email, { count: 2 });
      expect(secondMail.subject).toBe(VERIFICATION_SUBJECT);
      await auth.expectInvalidToken(firstToken);
      await auth.verifyEmail(verificationToken(secondMail)).expect(204);
    });

    it('deixa um único link válido quando vários reenvios chegam ao mesmo tempo', async () => {
      const email = uniqueEmail();
      await auth.registerAndGetToken(email);

      const responses = await Promise.all(
        Array.from({ length: 20 }, () => auth.resendVerification(email)),
      );

      expect(responses.map(({ status }) => status)).toEqual(
        Array(20).fill(204),
      );
      await waitForMailTo(email, { count: 21 });
      const tokens = (await readAllMailTo(email)).map(verificationToken);
      const statuses: number[] = [];
      for (const token of tokens) {
        statuses.push((await auth.verifyEmail(token)).status);
      }
      expect(statuses.filter((status) => status === 204)).toHaveLength(1);
      expect(statuses.filter((status) => status === 400)).toHaveLength(20);
    });

    it('responde 204 para um e-mail sem Usuário, sem enviar nada', async () => {
      const email = uniqueEmail();

      await auth.resendVerification(email).expect(204, {});

      // O cadastro em seguida é o envio conhecido: só o e-mail dele pode ter chegado.
      await auth.register(email).expect(201);
      await waitForMailTo(email);
      expect(await countMailTo(email)).toBe(1);
    });

    it('responde 204 para um e-mail já verificado, sem enviar verificação', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);

      await auth.resendVerification(email).expect(204, {});

      // O cadastro em seguida é o envio conhecido: depois do primeiro e-mail, só o aviso dele pode ter chegado.
      await auth.register(email).expect(201);
      const mail = await waitForMailTo(email, { count: 2 });
      expect(mail.subject).toBe(ALREADY_REGISTERED_SUBJECT);
      expect(await countMailTo(email)).toBe(2);
    });

    it('recusa um e-mail malformado com validation_error', async () => {
      const response = await auth
        .resendVerification('nome@exemplo')
        .expect(400);

      expect(response.body.code).toBe('validation_error');
    });
  });

  describe('verificação de e-mail', () => {
    it('aceita o link uma vez só: o segundo uso devolve invalid_token', async () => {
      const email = uniqueEmail();
      const token = await auth.registerAndGetToken(email);

      await auth.verifyEmail(token).expect(204, {});

      await auth.expectInvalidToken(token);
    });

    it('devolve invalid_token para um token que nunca foi emitido', async () => {
      await auth.expectInvalidToken('token-que-nunca-existiu');
    });

    it('devolve validation_error quando o token não vem', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({})
        .expect(400);

      expect(response.body.code).toBe('validation_error');
    });
  });

  describe('link de verificação expirado', () => {
    let shortLivedApp: INestApplication<App>;

    afterEach(async () => {
      await shortLivedApp.close();
    });

    it('devolve invalid_token depois do prazo de EMAIL_VERIFICATION_TTL_SECONDS', async () => {
      vi.stubEnv('EMAIL_VERIFICATION_TTL_SECONDS', '1');
      shortLivedApp = await createTestApp();
      const shortLived = authRoutes(shortLivedApp);
      const token = await shortLived.registerAndGetToken(uniqueEmail());

      await new Promise((resolve) => setTimeout(resolve, 1100));

      await shortLived.expectInvalidToken(token);
    });
  });
});

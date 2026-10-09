import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types.js';
import {
  authRoutes,
  PASSWORD,
  resetToken,
  sleep,
} from './support/auth-routes.js';
import { createTestApp } from './support/create-test-app.js';
import { countMailTo, uniqueEmail, waitForMailTo } from './support/mailpit.js';
import { expectValidationError } from './support/problem.js';

const RESET_SUBJECT = 'Redefina sua senha';
const PASSWORD_CHANGED_SUBJECT = 'Sua senha foi alterada';
const NEW_PASSWORD = 'outra senha bem longa';

describe('Recuperação de senha', () => {
  let app: INestApplication<App>;
  let auth: ReturnType<typeof authRoutes>;

  beforeAll(async () => {
    app = await createTestApp();
    auth = authRoutes(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('pedido do link', () => {
    it('responde 204 sem corpo e envia o e-mail de redefinição, com o link para a web', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);

      await auth.forgotPassword(email).expect(204, {});

      const mail = await waitForMailTo(email, { count: 2 });
      expect(mail.subject).toBe(RESET_SUBJECT);
      expect(mail.to).toEqual([email]);
      expect(mail.text).toContain(
        'http://localhost:3000/redefinir-senha?token=',
      );
      expect(mail.text).toContain('1 hora');
      expect(resetToken(mail)).toMatch(/^[\w-]{43}$/);
    });

    it('responde 204 para um e-mail sem Usuário, sem enviar nada', async () => {
      const email = uniqueEmail();

      await auth.forgotPassword(email).expect(204, {});

      // O cadastro em seguida é o envio conhecido: só o e-mail dele pode ter chegado.
      await auth.register(email).expect(201);
      await waitForMailTo(email);
      expect(await countMailTo(email)).toBe(1);
    });

    it('aceita o e-mail com maiúsculas e espaços nas pontas', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);

      await auth.forgotPassword(`  ${email.toUpperCase()} `).expect(204);

      const mail = await waitForMailTo(email, { count: 2 });
      expect(mail.subject).toBe(RESET_SUBJECT);
    });

    it('emite um link novo a cada pedido e invalida o anterior', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const firstToken = await auth.requestResetToken(email);

      const secondToken = await auth.requestResetToken(email, 3);

      expect(secondToken).not.toBe(firstToken);
      await auth.expectInvalidResetToken(firstToken);
      await auth.resetPassword(secondToken, NEW_PASSWORD).expect(204);
    });

    it('recusa um e-mail malformado com validation_error', async () => {
      const response = await auth.forgotPassword('nome@exemplo').expect(400);

      expectValidationError(response, 'email');
    });
  });

  describe('redefinição', () => {
    it('responde 204 sem corpo, sem devolver tokens, e a senha nova passa a valer no lugar da antiga', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const token = await auth.requestResetToken(email);

      await auth.resetPassword(token, NEW_PASSWORD).expect(204, {});

      await auth.expectInvalidCredentials(email, PASSWORD);
      const session = await auth.login(email, NEW_PASSWORD).expect(200);
      expect(session.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 15 * 60,
      });
    });

    it('encerra todas as Sessões do Usuário: nenhum token de renovação anterior funciona', async () => {
      const email = uniqueEmail();
      const first = await auth.openSession(email);
      const second = (await auth.login(email).expect(200)).body;
      // Um token já trocado e o que saiu dele: os dois ramos da mesma Sessão.
      const renewed = (await auth.refresh(first.refreshToken).expect(200)).body;
      const token = await auth.requestResetToken(email);

      await auth.resetPassword(token, NEW_PASSWORD).expect(204);

      await auth.expectRefreshRejected(first.refreshToken);
      await auth.expectRefreshRejected(renewed.refreshToken);
      await auth.expectRefreshRejected(second.refreshToken);
    });

    it('funciona para o Usuário não verificado, que sai verificado e consegue entrar', async () => {
      const email = uniqueEmail();
      await auth.register(email).expect(201);
      const token = await auth.requestResetToken(email);

      await auth.resetPassword(token, NEW_PASSWORD).expect(204);

      await auth.login(email, NEW_PASSWORD).expect(200);
    });

    it('envia o e-mail "sua senha foi alterada", sem link de redefinição', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const token = await auth.requestResetToken(email);

      await auth.resetPassword(token, NEW_PASSWORD).expect(204);

      const mail = await waitForMailTo(email, { count: 3 });
      expect(mail.subject).toBe(PASSWORD_CHANGED_SUBJECT);
      expect(mail.to).toEqual([email]);
      expect(mail.text).not.toContain('token=');
      expect(mail.text).toContain('http://localhost:3000/esqueci-minha-senha');
    });

    it('aceita o link uma vez só: o segundo uso devolve invalid_token e não troca a senha de novo', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const token = await auth.requestResetToken(email);
      await auth.resetPassword(token, NEW_PASSWORD).expect(204);

      await auth.expectInvalidResetToken(token, 'uma terceira senha longa');

      await auth.login(email, NEW_PASSWORD).expect(200);
    });

    it('devolve invalid_token para um token que nunca foi emitido', async () => {
      await auth.expectInvalidResetToken('um-token-que-nunca-existiu');
    });

    it('não aceita o token do link de verificação de e-mail', async () => {
      const email = uniqueEmail();
      const verificationToken = await auth.registerAndGetToken(email);

      await auth.expectInvalidResetToken(verificationToken);

      await auth.verifyEmail(verificationToken).expect(204);
      await auth.login(email, PASSWORD).expect(200);
    });

    it.each([
      ['com 9 caracteres', 'a'.repeat(9)],
      ['com 129 caracteres', 'a'.repeat(129)],
    ])(
      'recusa a senha %s com validation_error, sem consumir o link',
      async (_case, password) => {
        const email = uniqueEmail();
        await auth.registerVerified(email);
        const token = await auth.requestResetToken(email);

        const response = await auth.resetPassword(token, password).expect(400);

        expectValidationError(response, 'password');
        await auth.login(email, PASSWORD).expect(200);
        await auth.resetPassword(token, NEW_PASSWORD).expect(204);
      },
    );

    it.each([
      ['com 10 caracteres', 'a'.repeat(10)],
      ['com 128 caracteres', 'a'.repeat(128)],
      ['sem letra maiúscula, número nem símbolo', 'so letras minusculas'],
    ])('aceita a senha %s', async (_case, password) => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const token = await auth.requestResetToken(email);

      await auth.resetPassword(token, password).expect(204);

      await auth.login(email, password).expect(200);
    });

    it('devolve validation_error quando o token não vem', async () => {
      const response = await auth.resetPassword('', NEW_PASSWORD).expect(400);

      expectValidationError(response, 'token');
    });
  });

  describe('link de redefinição expirado', () => {
    let shortLivedApp: INestApplication<App>;

    afterEach(async () => {
      await shortLivedApp.close();
    });

    it('devolve invalid_token depois do prazo de PASSWORD_RESET_TTL_SECONDS, e a senha continua a mesma', async () => {
      vi.stubEnv('PASSWORD_RESET_TTL_SECONDS', '1');
      shortLivedApp = await createTestApp();
      const shortLived = authRoutes(shortLivedApp);
      const email = uniqueEmail();
      await shortLived.registerVerified(email);
      const token = await shortLived.requestResetToken(email);

      await sleep(1100);

      await shortLived.expectInvalidResetToken(token, NEW_PASSWORD);
      await shortLived.login(email, PASSWORD).expect(200);
    });
  });
});

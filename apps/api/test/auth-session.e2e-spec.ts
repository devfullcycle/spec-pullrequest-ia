import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
  authRoutes,
  INVALID_CREDENTIALS,
  PASSWORD,
  sleep,
} from './support/auth-routes.js';
import { createTestApp } from './support/create-test-app.js';
import { uniqueEmail } from './support/mailpit.js';
import { expectProblem } from './support/problem.js';

const UNAUTHENTICATED = {
  title: 'Unauthorized',
  status: 401,
  code: 'unauthenticated',
  detail: expect.any(String),
};

describe('Entrar e sair', () => {
  let app: INestApplication<App>;
  let auth: ReturnType<typeof authRoutes>;

  beforeAll(async () => {
    app = await createTestApp();
    auth = authRoutes(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('login', () => {
    it('devolve o par de tokens para um Usuário verificado com a senha certa', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);

      const response = await auth.login(email, PASSWORD).expect(200);

      expect(response.body).toEqual({
        accessToken: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
        // 256 bits em base64url.
        refreshToken: expect.stringMatching(/^[\w-]{43}$/),
        expiresIn: 15 * 60,
      });
    });

    it('devolve o mesmo invalid_credentials para a senha errada e para o e-mail sem Usuário', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);

      const wrongPassword = await auth
        .login(email, 'uma senha bem errada')
        .expect(401);
      const unknownEmail = await auth
        .login(uniqueEmail(), PASSWORD)
        .expect(401);

      expectProblem(wrongPassword, INVALID_CREDENTIALS);
      expect(unknownEmail.body).toEqual(wrongPassword.body);
      expect(unknownEmail.headers['content-type']).toBe(
        wrongPassword.headers['content-type'],
      );
    });

    it('devolve email_not_verified para o Usuário que ainda não verificou o e-mail', async () => {
      const email = uniqueEmail();
      await auth.registerAndGetToken(email);

      const response = await auth.login(email, PASSWORD).expect(403);

      expectProblem(response, {
        title: 'Forbidden',
        status: 403,
        code: 'email_not_verified',
        detail: expect.any(String),
      });
    });

    it('devolve invalid_credentials, e não email_not_verified, para a senha errada de um Usuário não verificado', async () => {
      const email = uniqueEmail();
      await auth.registerAndGetToken(email);

      await auth.expectInvalidCredentials(email, 'uma senha bem errada');
    });

    it('aceita o e-mail com maiúsculas e espaços nas pontas', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);

      await auth.login(`  ${email.toUpperCase()}  `, PASSWORD).expect(200);
    });

    it('abre uma Sessão nova a cada login, sem limite por Usuário', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);

      const first = await auth.login(email).expect(200);
      const second = await auth.login(email).expect(200);

      expect(second.body.refreshToken).not.toBe(first.body.refreshToken);
      await auth.me(first.body.accessToken).expect(200);
      await auth.me(second.body.accessToken).expect(200);
    });

    it.each([
      ['sem senha', { email: 'nome@exemplo.com' }, 'password'],
      [
        'com e-mail malformado',
        { email: 'nome@exemplo', password: PASSWORD },
        'email',
      ],
    ])(
      'recusa a entrada %s com validation_error',
      async (_case, body, field) => {
        const response = await request(app.getHttpServer())
          .post('/v1/auth/login')
          .send(body)
          .expect(400);

        expect(response.body.code).toBe('validation_error');
        expect(response.body.errors).toEqual([
          { field, messages: expect.any(Array) },
        ]);
      },
    );
  });

  describe('Usuário autenticado', () => {
    it('devolve só o id e o e-mail com um token de acesso válido', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const { body: tokens } = await auth.login(email).expect(200);

      const response = await auth.me(tokens.accessToken).expect(200);

      expect(response.body).toEqual({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        email,
      });
    });

    it('devolve unauthenticated sem token', async () => {
      expectProblem(await auth.me().expect(401), UNAUTHENTICATED);
    });

    it('devolve unauthenticated com um token de assinatura inválida', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const { body: tokens } = await auth.login(email).expect(200);
      const [header, payload] = tokens.accessToken.split('.');
      const forged = `${header}.${payload}.${'A'.repeat(342)}`;

      expectProblem(await auth.me(forged).expect(401), UNAUTHENTICATED);
    });

    it('devolve unauthenticated com um token sem assinatura (alg none)', async () => {
      const encode = (value: object) =>
        Buffer.from(JSON.stringify(value)).toString('base64url');
      const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
        sub: '0198a3f0-0000-7000-8000-000000000000',
        exp: Math.floor(Date.now() / 1000) + 600,
      })}.`;

      expectProblem(await auth.me(unsigned).expect(401), UNAUTHENTICATED);
    });

    it('devolve unauthenticated quando o cabeçalho não é Bearer', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const { body: tokens } = await auth.login(email).expect(200);

      const response = await request(app.getHttpServer())
        .get('/v1/me')
        .set('Authorization', `Basic ${tokens.accessToken}`)
        .expect(401);

      expectProblem(response, UNAUTHENTICATED);
    });

    it('aceita o esquema Bearer em qualquer caixa', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const { body: tokens } = await auth.login(email).expect(200);

      await request(app.getHttpServer())
        .get('/v1/me')
        .set('Authorization', `bearer ${tokens.accessToken}`)
        .expect(200);
    });

    it('devolve unauthenticated quando o cabeçalho traz algo além do token', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const { body: tokens } = await auth.login(email).expect(200);

      const response = await request(app.getHttpServer())
        .get('/v1/me')
        .set('Authorization', `Bearer ${tokens.accessToken} sobra`)
        .expect(401);

      expectProblem(response, UNAUTHENTICATED);
    });
  });

  describe('renovação', () => {
    it('devolve um par novo, e o token de acesso novo funciona na rota do Usuário autenticado', async () => {
      const email = uniqueEmail();
      const tokens = await auth.openSession(email);

      const response = await auth.refresh(tokens.refreshToken).expect(200);

      expect(response.body).toEqual({
        accessToken: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
        refreshToken: expect.stringMatching(/^[\w-]{43}$/),
        expiresIn: 15 * 60,
      });
      expect(response.body.refreshToken).not.toBe(tokens.refreshToken);
      const me = await auth.me(response.body.accessToken).expect(200);
      expect(me.body.email).toBe(email);
    });

    it('dá outro par válido ao token já trocado, dentro da janela de tolerância', async () => {
      const tokens = await auth.openSession(uniqueEmail());
      const { body: first } = await auth
        .refresh(tokens.refreshToken)
        .expect(200);

      const { body: second } = await auth
        .refresh(tokens.refreshToken)
        .expect(200);

      expect(second.refreshToken).not.toBe(first.refreshToken);
      await auth.me(second.accessToken).expect(200);
      // Os dois ramos seguem válidos.
      await auth.refresh(first.refreshToken).expect(200);
      await auth.refresh(second.refreshToken).expect(200);
    });

    it('atende renovações simultâneas com o mesmo token', async () => {
      const tokens = await auth.openSession(uniqueEmail());

      const responses = await Promise.all(
        Array.from({ length: 5 }, () => auth.refresh(tokens.refreshToken)),
      );

      expect(responses.map((response) => response.status)).toEqual(
        Array(5).fill(200),
      );
      const branches = responses.map((response) => response.body.refreshToken);
      expect(new Set(branches).size).toBe(5);
      for (const branch of branches) {
        await auth.refresh(branch).expect(200);
      }
    });

    it('devolve unauthenticated para um token que nunca foi emitido', async () => {
      await auth.expectRefreshRejected('um-token-que-nunca-existiu');
    });

    it('devolve validation_error quando o token não vem', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.code).toBe('validation_error');
    });
  });

  describe('logout', () => {
    it('responde 204 sem corpo, e as outras Sessões do Usuário continuam', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const { body: first } = await auth.login(email).expect(200);
      const { body: second } = await auth.login(email).expect(200);

      await auth.logout(first.refreshToken).expect(204, {});

      await auth.me(second.accessToken).expect(200);
    });

    // O fim da Sessão é observado pela renovação: o token de acesso vale até
    // expirar.
    it('encerra a Sessão do token: a renovação com ele deixa de funcionar', async () => {
      const tokens = await auth.openSession(uniqueEmail());

      await auth.logout(tokens.refreshToken).expect(204);

      await auth.expectRefreshRejected(tokens.refreshToken);
    });

    it('mantém as outras Sessões: a renovação delas continua funcionando', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const { body: first } = await auth.login(email).expect(200);
      const { body: second } = await auth.login(email).expect(200);

      await auth.logout(first.refreshToken).expect(204);

      await auth.refresh(second.refreshToken).expect(200);
    });

    it('invalida todos os ramos da Sessão depois de renovações simultâneas', async () => {
      const tokens = await auth.openSession(uniqueEmail());
      const [{ body: left }, { body: right }] = await Promise.all([
        auth.refresh(tokens.refreshToken).expect(200),
        auth.refresh(tokens.refreshToken).expect(200),
      ]);
      // Um ramo que já andou mais uma troca também é da mesma Sessão.
      const { body: leftAgain } = await auth
        .refresh(left.refreshToken)
        .expect(200);

      await auth.logout(right.refreshToken).expect(204);

      for (const token of [
        tokens.refreshToken,
        left.refreshToken,
        leftAgain.refreshToken,
        right.refreshToken,
      ]) {
        await auth.expectRefreshRejected(token);
      }
    });

    it('não deixa a Sessão viva quando a renovação e o logout chegam juntos', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);

      // A ordem entre as duas chamadas varia a cada rodada. Nas duas ordens, a
      // Sessão tem de acabar inteira.
      for (let round = 0; round < 8; round++) {
        const { body: tokens } = await auth.login(email).expect(200);

        const [renewal] = await Promise.all([
          auth.refresh(tokens.refreshToken),
          auth.logout(tokens.refreshToken).expect(204),
        ]);

        expect([200, 401]).toContain(renewal.status);
        await auth.expectRefreshRejected(tokens.refreshToken);
        if (renewal.status === 200) {
          await auth.expectRefreshRejected(renewal.body.refreshToken);
        }
      }
    });

    it('responde 204 para um token que nunca foi emitido', async () => {
      await auth.logout('um-token-que-nunca-existiu').expect(204, {});
    });

    it('responde 204 para um token de qualquer tamanho', async () => {
      await auth.logout('a'.repeat(5000)).expect(204, {});
    });

    it('responde 204 para o token de uma Sessão já encerrada', async () => {
      const tokens = await auth.openSession(uniqueEmail());
      await auth.logout(tokens.refreshToken).expect(204);

      await auth.logout(tokens.refreshToken).expect(204, {});
    });

    it('devolve validation_error quando o token não vem', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .send({})
        .expect(400);

      expect(response.body.code).toBe('validation_error');
    });
  });

  describe('tokens expirados', () => {
    let shortLivedApp: INestApplication<App>;

    afterEach(async () => {
      await shortLivedApp.close();
    });

    it('devolve unauthenticated depois do prazo de ACCESS_TOKEN_TTL_SECONDS', async () => {
      vi.stubEnv('ACCESS_TOKEN_TTL_SECONDS', '1');
      shortLivedApp = await createTestApp();
      const shortLived = authRoutes(shortLivedApp);
      const tokens = await shortLived.openSession(uniqueEmail());
      expect(tokens.expiresIn).toBe(1);
      await shortLived.me(tokens.accessToken).expect(200);

      await sleep(2100);

      expectProblem(
        await shortLived.me(tokens.accessToken).expect(401),
        UNAUTHENTICATED,
      );
    });

    it('sem tolerância, recusa o token trocado no uso seguinte e encerra as Sessões', async () => {
      vi.stubEnv('REFRESH_TOKEN_REUSE_GRACE_SECONDS', '0');
      shortLivedApp = await createTestApp();
      const shortLived = authRoutes(shortLivedApp);
      const tokens = await shortLived.openSession(uniqueEmail());
      const { body: renewed } = await shortLived
        .refresh(tokens.refreshToken)
        .expect(200);

      await shortLived.expectRefreshRejected(tokens.refreshToken);
      await shortLived.expectRefreshRejected(renewed.refreshToken);
    });

    it('encerra todas as Sessões quando o token trocado é reapresentado depois de expirar', async () => {
      vi.stubEnv('REFRESH_TOKEN_TTL_SECONDS', '3');
      vi.stubEnv('REFRESH_TOKEN_REUSE_GRACE_SECONDS', '1');
      shortLivedApp = await createTestApp();
      const shortLived = authRoutes(shortLivedApp);
      const stolen = await shortLived.openSession(uniqueEmail());
      // O token novo nasce com a validade inteira, e passa a durar mais que o trocado.
      await sleep(2000);
      const { body: renewed } = await shortLived
        .refresh(stolen.refreshToken)
        .expect(200);

      await sleep(1300);

      await shortLived.expectRefreshRejected(stolen.refreshToken);
      await shortLived.expectRefreshRejected(renewed.refreshToken);
    });

    it('com um token de renovação expirado, a renovação devolve unauthenticated e sair responde 204', async () => {
      vi.stubEnv('REFRESH_TOKEN_TTL_SECONDS', '1');
      shortLivedApp = await createTestApp();
      const shortLived = authRoutes(shortLivedApp);
      const tokens = await shortLived.openSession(uniqueEmail());

      await sleep(1100);

      await shortLived.expectRefreshRejected(tokens.refreshToken);
      await shortLived.logout(tokens.refreshToken).expect(204, {});
    });

    it('recusa o token trocado depois da janela de tolerância e encerra todas as Sessões do Usuário', async () => {
      vi.stubEnv('REFRESH_TOKEN_REUSE_GRACE_SECONDS', '1');
      shortLivedApp = await createTestApp();
      const shortLived = authRoutes(shortLivedApp);
      const email = uniqueEmail();
      const stolen = await shortLived.openSession(email);
      const { body: otherSession } = await shortLived.login(email).expect(200);
      const otherUser = await shortLived.openSession(uniqueEmail());
      const { body: renewed } = await shortLived
        .refresh(stolen.refreshToken)
        .expect(200);

      await sleep(1100);

      for (const token of [
        stolen.refreshToken,
        renewed.refreshToken,
        otherSession.refreshToken,
      ]) {
        await shortLived.expectRefreshRejected(token);
      }
      // Só as Sessões do Usuário do token caem.
      await shortLived.refresh(otherUser.refreshToken).expect(200);
    });
  });
});

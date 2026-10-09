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

  describe('logout', () => {
    it('responde 204 sem corpo, e as outras Sessões do Usuário continuam', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const { body: first } = await auth.login(email).expect(200);
      const { body: second } = await auth.login(email).expect(200);

      await auth.logout(first.refreshToken).expect(204, {});

      await auth.me(second.accessToken).expect(200);
    });

    // O fim da Sessão só é observável pela renovação, que chega com o ticket da
    // Sessão que se renova: o token de acesso vale até expirar.
    it.todo(
      'encerra a Sessão do token: a renovação com ele deixa de funcionar',
    );
    it.todo('mantém as outras Sessões: a renovação delas continua funcionando');

    it('responde 204 para um token que nunca foi emitido', async () => {
      await auth.logout('um-token-que-nunca-existiu').expect(204, {});
    });

    it('responde 204 para um token de qualquer tamanho', async () => {
      await auth.logout('a'.repeat(5000)).expect(204, {});
    });

    it('responde 204 para o token de uma Sessão já encerrada', async () => {
      const email = uniqueEmail();
      await auth.registerVerified(email);
      const { body: tokens } = await auth.login(email).expect(200);
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
      const email = uniqueEmail();
      await shortLived.registerVerified(email);
      const { body: tokens } = await shortLived.login(email).expect(200);
      expect(tokens.expiresIn).toBe(1);
      await shortLived.me(tokens.accessToken).expect(200);

      await sleep(2100);

      expectProblem(
        await shortLived.me(tokens.accessToken).expect(401),
        UNAUTHENTICATED,
      );
    });

    it('responde 204 ao sair com um token de renovação expirado', async () => {
      vi.stubEnv('REFRESH_TOKEN_TTL_SECONDS', '1');
      shortLivedApp = await createTestApp();
      const shortLived = authRoutes(shortLivedApp);
      const email = uniqueEmail();
      await shortLived.registerVerified(email);
      const { body: tokens } = await shortLived.login(email).expect(200);

      await sleep(1100);

      await shortLived.logout(tokens.refreshToken).expect(204, {});
    });
  });
});

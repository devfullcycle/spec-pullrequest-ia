import { INestApplication } from '@nestjs/common';
import type { Test } from 'supertest';
import { App } from 'supertest/types.js';
import { appConfig } from '../src/config/app.config.js';
import { authRoutes, PASSWORD, sleep } from './support/auth-routes.js';
import { createTestApp } from './support/create-test-app.js';
import { cleanDatabase } from './support/database.js';
import { countMailTo, uniqueEmail, waitForMailTo } from './support/mailpit.js';
import { expectProblem } from './support/problem.js';

const RATE_LIMITED = {
  title: 'Too Many Requests',
  status: 429,
  code: 'rate_limited',
  detail: expect.any(String),
};

const WRONG_PASSWORD = 'uma senha bem errada';

describe('Limite de tentativas', () => {
  let app: INestApplication<App>;
  let auth: ReturnType<typeof authRoutes>;

  /** Sobe a aplicação com os tetos e as janelas do teste. */
  async function boot(limits: Record<string, number>): Promise<void> {
    for (const [variable, value] of Object.entries(limits)) {
      vi.stubEnv(variable, String(value));
    }
    app = await createTestApp();
    auth = authRoutes(app);
  }

  /** Erra a senha do e-mail `times` vezes, todas ainda dentro do teto. */
  async function failLogin(email: string, times: number): Promise<void> {
    for (let attempt = 1; attempt <= times; attempt++) {
      await auth.expectInvalidCredentials(email, WRONG_PASSWORD);
    }
  }

  /** Faz a chamada dizer de que IP ela vem, com o segredo da API, como a web faz. */
  const fromWeb = () => forwardedBy(app.get(appConfig.KEY).internalApiSecret);

  // Todas as chamadas saem do mesmo IP, e o contador dele atravessaria os testes.
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('login, por e-mail', () => {
    it('devolve rate_limited na sexta tentativa, exista ou não o Usuário, com a mesma resposta', async () => {
      await boot({ LOGIN_RATE_LIMIT_PER_EMAIL: 5 });
      const registered = uniqueEmail();
      const unknown = uniqueEmail();
      await auth.registerVerified(registered);
      for (const email of [registered, unknown]) {
        await failLogin(email, 5);
      }

      const forRegistered = await auth
        .login(registered, WRONG_PASSWORD)
        .expect(429);
      const forUnknown = await auth.login(unknown, WRONG_PASSWORD).expect(429);

      expectProblem(forRegistered, RATE_LIMITED);
      expect(forUnknown.body).toEqual(forRegistered.body);
      expect(forUnknown.headers['content-type']).toBe(
        forRegistered.headers['content-type'],
      );
    });

    it('devolve rate_limited também para a senha certa, com o limite estourado', async () => {
      await boot({ LOGIN_RATE_LIMIT_PER_EMAIL: 5 });
      const email = uniqueEmail();
      await auth.registerVerified(email);
      await failLogin(email, 5);

      expectProblem(
        await auth.login(email, PASSWORD).expect(429),
        RATE_LIMITED,
      );
    });

    it('conta as grafias do mesmo e-mail juntas', async () => {
      await boot({ LOGIN_RATE_LIMIT_PER_EMAIL: 2 });
      const email = uniqueEmail();
      await auth.expectInvalidCredentials(email, WRONG_PASSWORD);
      await auth.expectInvalidCredentials(email.toUpperCase(), WRONG_PASSWORD);

      await auth.login(` ${email} `, WRONG_PASSWORD).expect(429);
    });

    it('não conta a entrada que a validação recusa', async () => {
      await boot({ LOGIN_RATE_LIMIT_PER_EMAIL: 1 });
      const email = uniqueEmail();
      await auth.login(email, '').expect(400);
      await auth.login(email, '').expect(400);

      await auth.expectInvalidCredentials(email, WRONG_PASSWORD);
    });

    it('volta a aceitar o login quando a janela fecha', async () => {
      await boot({
        LOGIN_RATE_LIMIT_PER_EMAIL: 2,
        LOGIN_RATE_LIMIT_WINDOW_SECONDS: 1,
      });
      const email = uniqueEmail();
      await auth.registerVerified(email);
      await failLogin(email, 2);
      await auth.login(email, PASSWORD).expect(429);

      await sleep(1100);

      await auth.login(email, PASSWORD).expect(200);
    });

    it('não estica a janela com as tentativas feitas durante o bloqueio', async () => {
      await boot({
        LOGIN_RATE_LIMIT_PER_EMAIL: 1,
        LOGIN_RATE_LIMIT_WINDOW_SECONDS: 2,
      });
      const email = uniqueEmail();
      await auth.registerVerified(email);
      await auth.expectInvalidCredentials(email, WRONG_PASSWORD);

      await sleep(1200);
      await auth.login(email, PASSWORD).expect(429);
      await sleep(1000);

      // Passaram 2,2 segundos da primeira tentativa, e só 1 da bloqueada.
      await auth.login(email, PASSWORD).expect(200);
    });
  });

  describe('login, por IP', () => {
    it('bloqueia tentativas com e-mails diferentes vindas do mesmo IP', async () => {
      await boot({ LOGIN_RATE_LIMIT_PER_IP: 3 });
      for (let attempt = 1; attempt <= 3; attempt++) {
        await auth.expectInvalidCredentials(uniqueEmail(), WRONG_PASSWORD);
      }

      expectProblem(
        await auth.login(uniqueEmail(), WRONG_PASSWORD).expect(429),
        RATE_LIMITED,
      );
    });

    it('com o segredo correto, conta pelo IP repassado: dois IPs diferentes não se bloqueiam', async () => {
      await boot({ LOGIN_RATE_LIMIT_PER_IP: 2 });
      const from = fromWeb();
      for (let attempt = 1; attempt <= 2; attempt++) {
        await from('203.0.113.7', auth.login(uniqueEmail())).expect(401);
      }

      await from('203.0.113.7', auth.login(uniqueEmail())).expect(429);
      await from('203.0.113.8', auth.login(uniqueEmail())).expect(401);
      await from('2001:db8::8', auth.login(uniqueEmail())).expect(401);
      // O IP da conexão é outro contador, que as chamadas repassadas não tocaram.
      await auth.expectInvalidCredentials(uniqueEmail(), WRONG_PASSWORD);
    });

    it('conta juntas as grafias do mesmo IP repassado', async () => {
      await boot({ LOGIN_RATE_LIMIT_PER_IP: 2 });
      const from = fromWeb();
      await from('203.0.113.7', auth.login(uniqueEmail())).expect(401);
      await from('::ffff:203.0.113.7', auth.login(uniqueEmail())).expect(401);

      await from('::FFFF:203.0.113.7', auth.login(uniqueEmail())).expect(429);
    });

    it.each([
      ['sem o segredo', undefined],
      ['com o segredo errado', 'um-segredo-que-nao-e-o-da-api-nem-de-longe'],
      ['com o segredo vazio', ''],
    ])(
      '%s, ignora o IP repassado e conta pelo IP da conexão',
      async (_case, secret) => {
        await boot({ LOGIN_RATE_LIMIT_PER_IP: 2 });
        const from = forwardedBy(secret);
        await from('203.0.113.7', auth.login(uniqueEmail())).expect(401);
        await from('203.0.113.8', auth.login(uniqueEmail())).expect(401);

        // Cada chamada disse vir de um IP, e as três saíram da mesma conexão.
        await from('203.0.113.9', auth.login(uniqueEmail())).expect(429);
        await auth.login(uniqueEmail()).expect(429);
      },
    );

    it('com o segredo correto e um IP repassado malformado, conta pelo IP da conexão', async () => {
      await boot({ LOGIN_RATE_LIMIT_PER_IP: 2 });
      const from = fromWeb();
      await from('não é um IP', auth.login(uniqueEmail())).expect(401);
      await from('203.0.113.7, 203.0.113.8', auth.login(uniqueEmail())).expect(
        401,
      );

      await auth.login(uniqueEmail()).expect(429);
    });
  });

  describe('cadastro, reenvio de verificação e "esqueci a senha"', () => {
    const routes = [
      ['cadastro', 'register', 201],
      ['reenvio de verificação', 'resendVerification', 204],
      ['"esqueci a senha"', 'forgotPassword', 204],
    ] as const;

    it.each(routes)(
      'devolve rate_limited no quarto %s para o mesmo e-mail, exista ou não o Usuário',
      async (_name, route, status) => {
        await boot({ EMAIL_REQUEST_RATE_LIMIT_PER_EMAIL: 3 });
        const registered = uniqueEmail();
        const unknown = uniqueEmail();
        // O reenvio é quem deixa o Usuário cadastrado sem gastar o contador da
        // rota do teste, que no cadastro é o próprio cadastro.
        if (route !== 'register') {
          await auth.register(registered).expect(201);
        }
        for (const email of [registered, unknown]) {
          for (let attempt = 1; attempt <= 3; attempt++) {
            await auth[route](email).expect(status);
          }
        }

        const forRegistered = await auth[route](registered).expect(429);
        const forUnknown = await auth[route](unknown).expect(429);

        expectProblem(forRegistered, RATE_LIMITED);
        expect(forUnknown.body).toEqual(forRegistered.body);
      },
    );

    it.each(routes)(
      'bloqueia o %s de e-mails diferentes vindos do mesmo IP',
      async (_name, route, status) => {
        await boot({ EMAIL_REQUEST_RATE_LIMIT_PER_IP: 2 });
        await auth[route](uniqueEmail()).expect(status);
        await auth[route](uniqueEmail()).expect(status);

        expectProblem(
          await auth[route](uniqueEmail()).expect(429),
          RATE_LIMITED,
        );
      },
    );

    it('não envia e-mail no pedido bloqueado', async () => {
      await boot({ EMAIL_REQUEST_RATE_LIMIT_PER_EMAIL: 1 });
      const email = uniqueEmail();
      await auth.register(email).expect(201);
      await auth.resendVerification(email).expect(204);
      await waitForMailTo(email, { count: 2 });

      await auth.register(email).expect(429);
      await auth.resendVerification(email).expect(429);

      // O pedido de redefinição é o envio conhecido: com ele, são três e-mails.
      await auth.forgotPassword(email).expect(204);
      await waitForMailTo(email, { count: 3 });
      expect(await countMailTo(email)).toBe(3);
    });

    it('conta cada rota à parte: o cadastro bloqueado não trava o login nem os outros pedidos', async () => {
      await boot({
        EMAIL_REQUEST_RATE_LIMIT_PER_EMAIL: 1,
        LOGIN_RATE_LIMIT_PER_EMAIL: 1,
      });
      const email = uniqueEmail();
      await auth.register(email).expect(201);
      await auth.register(email).expect(429);

      await auth.resendVerification(email).expect(204);
      await auth.forgotPassword(email).expect(204);
      await auth.expectInvalidCredentials(email, WRONG_PASSWORD);
    });

    it('volta a aceitar o pedido quando a janela fecha', async () => {
      await boot({
        EMAIL_REQUEST_RATE_LIMIT_PER_EMAIL: 1,
        EMAIL_REQUEST_RATE_LIMIT_WINDOW_SECONDS: 1,
      });
      const email = uniqueEmail();
      await auth.forgotPassword(email).expect(204);
      await auth.forgotPassword(email).expect(429);

      await sleep(1100);

      await auth.forgotPassword(email).expect(204);
    });
  });
});

/**
 * Faz a chamada dizer de que IP ela vem, como a web faz, com o segredo dado.
 * Sem segredo, o cabeçalho dele não vai.
 */
function forwardedBy(secret: string | undefined) {
  return (ip: string, call: Test): Test => {
    const forwarded = call.set('X-Client-Ip', ip);
    return secret === undefined
      ? forwarded
      : forwarded.set('X-Internal-Secret', secret);
  };
}

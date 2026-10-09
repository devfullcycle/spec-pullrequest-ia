import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { CapturedMail, extractLink, waitForMailTo } from './mailpit.js';
import { expectProblem } from './problem.js';

export const PASSWORD = 'uma senha bem longa';

/** O erro do login com a senha errada ou com um e-mail sem Usuário. */
export const INVALID_CREDENTIALS = {
  title: 'Unauthorized',
  status: 401,
  code: 'invalid_credentials',
  detail: 'E-mail ou senha incorretos.',
};

const INVALID_TOKEN = {
  title: 'Bad Request',
  status: 400,
  code: 'invalid_token',
  detail: expect.any(String),
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** O token do link de verificação que o e-mail traz. */
export function verificationToken(mail: CapturedMail): string {
  return extractLink(mail, '/verificar-email').searchParams.get('token') ?? '';
}

/** O token do link de redefinição de senha que o e-mail traz. */
export function resetToken(mail: CapturedMail): string {
  return extractLink(mail, '/redefinir-senha').searchParams.get('token') ?? '';
}

/** As chamadas da autenticação, contra uma aplicação de teste. */
export function authRoutes(app: INestApplication<App>) {
  const post = (route: string, body: object) =>
    request(app.getHttpServer()).post(`/v1/auth/${route}`).send(body);

  const register = (email: string, password = PASSWORD) =>
    post('register', { email, password });
  const verifyEmail = (token: string) => post('verify-email', { token });
  const resendVerification = (email: string) =>
    post('resend-verification', { email });
  const login = (email: string, password = PASSWORD) =>
    post('login', { email, password });
  const logout = (refreshToken: string) => post('logout', { refreshToken });
  const refresh = (refreshToken: string) => post('refresh', { refreshToken });
  const forgotPassword = (email: string) => post('forgot-password', { email });
  const resetPassword = (token: string, password: string) =>
    post('reset-password', { token, password });

  /** Cadastra o e-mail e devolve o token do link de verificação que chegou. */
  const registerAndGetToken = async (email: string) => {
    await register(email).expect(201);
    return verificationToken(await waitForMailTo(email));
  };

  /** Deixa o e-mail com um Usuário já verificado. */
  const registerVerified = async (email: string) => {
    await verifyEmail(await registerAndGetToken(email)).expect(204);
  };

  /**
   * Pede a redefinição e devolve o token do link que chegou. `count` é quantos
   * e-mails o endereço já tem de ter recebido com este: o padrão conta o do
   * cadastro e o do pedido.
   */
  const requestResetToken = async (email: string, count = 2) => {
    await forgotPassword(email).expect(204);
    return resetToken(await waitForMailTo(email, { count }));
  };

  /** Deixa um Usuário verificado com uma Sessão aberta e devolve o par de tokens dela. */
  const openSession = async (
    email: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> => {
    await registerVerified(email);
    return (await login(email).expect(200)).body;
  };

  return {
    register,
    verifyEmail,
    resendVerification,
    login,
    logout,
    refresh,
    forgotPassword,
    resetPassword,
    requestResetToken,
    registerAndGetToken,
    registerVerified,
    openSession,
    /** `GET /me`, com o token de acesso no cabeçalho quando ele é passado. */
    me: (accessToken?: string) => {
      const call = request(app.getHttpServer()).get('/v1/me');
      return accessToken
        ? call.set('Authorization', `Bearer ${accessToken}`)
        : call;
    },
    /** A verificação de e-mail recusa o token com `invalid_token`. */
    expectInvalidToken: async (token: string) => {
      expectProblem(await verifyEmail(token).expect(400), INVALID_TOKEN);
    },
    /** A redefinição de senha recusa o token com `invalid_token`. */
    expectInvalidResetToken: async (token: string, password = PASSWORD) => {
      expectProblem(
        await resetPassword(token, password).expect(400),
        INVALID_TOKEN,
      );
    },
    /** A renovação recusa o token com `unauthenticated`. */
    expectRefreshRejected: async (refreshToken: string) => {
      expectProblem(await refresh(refreshToken).expect(401), {
        title: 'Unauthorized',
        status: 401,
        code: 'unauthenticated',
        detail: expect.any(String),
      });
    },
    expectInvalidCredentials: async (email: string, password: string) => {
      expectProblem(
        await login(email, password).expect(401),
        INVALID_CREDENTIALS,
      );
    },
  };
}

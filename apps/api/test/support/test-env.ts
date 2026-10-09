import { existsSync } from 'node:fs';

declare module 'vitest' {
  interface ProvidedContext {
    /** URL do banco de testes, calculada uma vez por execução da suíte. */
    testDatabaseUrl: string;
    /** Endereço da API HTTP do Mailpit, de onde os testes leem os e-mails enviados. */
    mailpitApiUrl: string;
  }
}

const TEST_DATABASE_SUFFIX = '_test';

/**
 * Carrega o `.env` nas variáveis de ambiente das suítes de integração e de
 * ponta a ponta. O que já está definido no ambiente prevalece.
 */
export function loadEnvFile(): void {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
}

/**
 * URL do banco de testes: o mesmo PostgreSQL de `DATABASE_URL`, com o sufixo
 * `_test` no nome do banco (`app` vira `app_test`). O sufixo é sempre
 * acrescentado, para o resultado nunca ser o próprio banco de desenvolvimento.
 */
export function toTestDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL não está definida. Suba o ambiente pelo Compose antes de rodar os testes.',
    );
  }
  const url = new URL(databaseUrl);
  if (!/^\/[^/]+$/.test(url.pathname)) {
    throw new Error(
      'DATABASE_URL precisa trazer o nome do banco, e é dele que sai o banco de testes.',
    );
  }
  url.pathname += TEST_DATABASE_SUFFIX;
  return url.toString();
}

/**
 * Endereço da API HTTP do Mailpit. O host é o mesmo de `SMTP_URL`, para a
 * leitura cair no servidor que recebe os envios.
 */
export function toMailpitApiUrl(smtpUrl: string | undefined): string {
  if (!smtpUrl) {
    throw new Error(
      'SMTP_URL não está definida. Suba o ambiente pelo Compose antes de rodar os testes.',
    );
  }
  return `http://${new URL(smtpUrl).hostname}:8025`;
}

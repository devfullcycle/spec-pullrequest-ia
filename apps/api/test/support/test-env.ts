import { existsSync } from 'node:fs';

const TEST_DATABASE_SUFFIX = '_test';

/** Diz se a URL aponta para o banco de testes, e não para o de desenvolvimento. */
export function isTestDatabaseUrl(databaseUrl: string): boolean {
  return new URL(databaseUrl).pathname.endsWith(TEST_DATABASE_SUFFIX);
}

/**
 * Troca o banco da URL pelo banco de testes, que fica no mesmo PostgreSQL e leva
 * o sufixo `_test` (`app` vira `app_test`).
 */
function toTestDatabaseUrl(databaseUrl: string): string {
  if (isTestDatabaseUrl(databaseUrl)) {
    return databaseUrl;
  }
  const url = new URL(databaseUrl);
  url.pathname += TEST_DATABASE_SUFFIX;
  return url.toString();
}

/**
 * Prepara as variáveis de ambiente das suítes de integração e de ponta a ponta:
 * carrega o `.env` e aponta `DATABASE_URL` para o banco de testes. Pode ser
 * chamada mais de uma vez.
 */
export function loadTestEnv(): void {
  if (existsSync('.env')) {
    // Não sobrescreve o que já está definido no ambiente.
    process.loadEnvFile('.env');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL não está definida. Suba o ambiente pelo Compose antes de rodar os testes.',
    );
  }
  process.env.DATABASE_URL = toTestDatabaseUrl(databaseUrl);
}

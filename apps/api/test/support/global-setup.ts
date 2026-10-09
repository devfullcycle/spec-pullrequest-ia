import { execFileSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';
import { loadEnvFile, toMailpitApiUrl, toTestDatabaseUrl } from './test-env.js';

/**
 * Roda uma vez por execução da suíte: calcula a URL do banco de testes, cria o
 * banco, se ele ainda não existir, e aplica as migrações nele. Entrega aos
 * arquivos de teste os endereços do banco de testes e do Mailpit, que assim não
 * mudam quando um teste troca uma variável de ambiente.
 */
export default function setup(project: TestProject): void {
  loadEnvFile();
  const testDatabaseUrl = toTestDatabaseUrl(process.env.DATABASE_URL);

  execFileSync('node_modules/.bin/prisma', ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'pipe',
  });

  project.provide('testDatabaseUrl', testDatabaseUrl);
  project.provide('mailpitApiUrl', toMailpitApiUrl(process.env.SMTP_URL));
}

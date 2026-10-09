import { execFileSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';
import { loadEnvFile, toTestDatabaseUrl } from './test-env.js';

/**
 * Roda uma vez por execução da suíte: calcula a URL do banco de testes, cria o
 * banco, se ele ainda não existir, aplica as migrações nele e entrega a URL aos
 * arquivos de teste.
 */
export default function setup(project: TestProject): void {
  loadEnvFile();
  const testDatabaseUrl = toTestDatabaseUrl(process.env.DATABASE_URL);

  execFileSync('node_modules/.bin/prisma', ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'pipe',
  });

  project.provide('testDatabaseUrl', testDatabaseUrl);
}

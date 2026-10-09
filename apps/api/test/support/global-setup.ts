import { execFileSync } from 'node:child_process';
import { loadTestEnv } from './test-env.js';

/**
 * Roda uma vez por execução da suíte: cria o banco de testes, se ele ainda não
 * existir, e aplica as migrações nele.
 */
export default function setup(): void {
  loadTestEnv();

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
}

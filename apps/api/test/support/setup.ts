import { inject } from 'vitest';
import { cleanDatabase } from './database.js';
import { loadEnvFile } from './test-env.js';

// Roda antes de cada arquivo de teste das suítes de integração e de ponta a
// ponta: a aplicação do teste só enxerga o banco de testes.
loadEnvFile();
process.env.DATABASE_URL = inject('testDatabaseUrl');

// Os testes saem todos do mesmo IP e repetem chamadas com o mesmo e-mail, então
// os tetos do limite de tentativas ficam fora do caminho. O teste do limite
// reduz, com `vi.stubEnv`, o teto que ele exercita.
for (const variable of [
  'LOGIN_RATE_LIMIT_PER_EMAIL',
  'LOGIN_RATE_LIMIT_PER_IP',
  'EMAIL_REQUEST_RATE_LIMIT_PER_EMAIL',
  'EMAIL_REQUEST_RATE_LIMIT_PER_IP',
]) {
  process.env[variable] = '1000000';
}

beforeAll(async () => {
  await cleanDatabase();
});

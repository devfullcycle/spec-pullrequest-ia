import { inject } from 'vitest';
import { cleanDatabase } from './database.js';
import { loadEnvFile } from './test-env.js';

// Roda antes de cada arquivo de teste das suítes de integração e de ponta a
// ponta: a aplicação do teste só enxerga o banco de testes.
loadEnvFile();
process.env.DATABASE_URL = inject('testDatabaseUrl');

beforeAll(async () => {
  await cleanDatabase();
});

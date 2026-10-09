import { cleanDatabase } from './database.js';
import { loadTestEnv } from './test-env.js';

// Roda antes de cada arquivo de teste das suítes de integração e de ponta a ponta.
loadTestEnv();

beforeAll(async () => {
  await cleanDatabase();
});

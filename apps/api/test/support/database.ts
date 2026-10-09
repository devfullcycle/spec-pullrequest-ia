import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';

// A limpeza usa a URL calculada pelo setup global, e não `DATABASE_URL`: assim
// um teste que troca a variável não faz a limpeza cair em outro banco.
function createTestDatabaseClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: inject('testDatabaseUrl') }),
  });
}

/** Esvazia todas as tabelas do banco de testes, menos o histórico de migrações. */
export async function cleanDatabase(): Promise<void> {
  const client = createTestDatabaseClient();
  try {
    const tables = await client.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    `;
    if (tables.length > 0) {
      const names = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
      await client.$executeRawUnsafe(
        `TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`,
      );
    }
  } finally {
    await client.$disconnect();
  }
}

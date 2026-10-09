import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { isTestDatabaseUrl } from './test-env.js';

function createTestDatabaseClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? '';
  if (!isTestDatabaseUrl(connectionString)) {
    throw new Error(
      'A base de testes só fala com o banco de testes (sufixo _test).',
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
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

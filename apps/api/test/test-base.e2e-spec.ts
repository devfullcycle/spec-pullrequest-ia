import { INestApplication } from '@nestjs/common';
import { AddressInfo, createServer, Socket } from 'node:net';
import { App } from 'supertest/types.js';
import { appConfig } from '../src/config/app.config.js';
import { PrismaService } from '../src/infra/database/prisma.service.js';
import { createTestApp } from './support/create-test-app.js';
import { cleanDatabase } from './support/database.js';

// Confere a própria base de testes. É o único teste que olha o banco por dentro:
// os testes das funcionalidades só observam o que sai pelas rotas.
describe('Base de testes', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sobe a aplicação inteira ligada ao banco de testes, e não ao de desenvolvimento', async () => {
    const [{ name }] = await app.get(PrismaService).$queryRaw<
      { name: string }[]
    >`SELECT current_database() AS name`;

    expect(name).toMatch(/_test$/);
  });

  it('entrega à aplicação a variável de ambiente que o teste trocou antes de subi-la', async () => {
    vi.stubEnv('PORT', '4999');
    const appWithOverride = await createTestApp();
    try {
      expect(appWithOverride.get(appConfig.KEY).port).toBe(4999);
    } finally {
      await appWithOverride.close();
    }
  });

  it('valida a variável trocada pelo teste, e não sobe a aplicação se ela for inválida', async () => {
    vi.stubEnv('PORT', 'abc');
    await expect(createTestApp()).rejects.toThrow(/"PORT" must be a number/);
  });

  it('não sobe a aplicação quando o banco não aceita conexões', async () => {
    // A porta 1 do serviço do banco não tem ninguém ouvindo.
    vi.stubEnv('DATABASE_URL', 'postgresql://app:app@postgres:1/app_test');

    await expect(createTestApp()).rejects.toThrow();
  });

  it('desiste, no prazo de DATABASE_CONNECT_TIMEOUT_MS, de um banco que aceita a conexão e não responde', async () => {
    // Um servidor mudo neste mesmo contêiner: é o único jeito de provocar a espera.
    const sockets: Socket[] = [];
    const silentServer = createServer((socket) => sockets.push(socket));
    await new Promise<void>((resolve) =>
      silentServer.listen(0, '127.0.0.1', resolve),
    );
    const { port } = silentServer.address() as AddressInfo;
    vi.stubEnv('DATABASE_URL', `postgresql://app:app@127.0.0.1:${port}/app`);
    vi.stubEnv('DATABASE_CONNECT_TIMEOUT_MS', '300');

    try {
      const startedAt = Date.now();
      await expect(createTestApp()).rejects.toThrow();
      expect(Date.now() - startedAt).toBeLessThan(3000);
    } finally {
      sockets.forEach((socket) => socket.destroy());
      silentServer.close();
    }
  }, 8000);

  it('aplica no banco de testes as mesmas migrações do banco de desenvolvimento', async () => {
    const extensions = await app.get(PrismaService).$queryRaw<
      { extname: string }[]
    >`SELECT extname FROM pg_extension`;

    expect(extensions.map(({ extname }) => extname)).toEqual(
      expect.arrayContaining(['citext', 'pg_trgm']),
    );
  });

  it('esvazia as tabelas na limpeza, mas preserva o histórico de migrações', async () => {
    const database = app.get(PrismaService);
    try {
      await database.$executeRaw`CREATE TABLE test_base_probe (id INT PRIMARY KEY)`;
      await database.$executeRaw`INSERT INTO test_base_probe (id) VALUES (1), (2)`;

      await cleanDatabase();

      const [{ rows }] = await database.$queryRaw<
        { rows: number }[]
      >`SELECT count(*)::int AS rows FROM test_base_probe`;
      const [{ migrations }] = await database.$queryRaw<
        { migrations: number }[]
      >`SELECT count(*)::int AS migrations FROM _prisma_migrations`;
      expect(rows).toBe(0);
      expect(migrations).toBeGreaterThan(0);
    } finally {
      await database.$executeRaw`DROP TABLE IF EXISTS test_base_probe`;
    }
  });
});

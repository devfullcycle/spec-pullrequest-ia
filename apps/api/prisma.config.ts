import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// A CLI do Prisma roda fora do Nest, então lê o `.env` por conta própria.
// Uma variável já definida no ambiente prevalece sobre a do arquivo.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `prisma generate` não usa a conexão, e por isso a URL pode faltar no build da imagem.
    url: process.env.DATABASE_URL ?? '',
  },
});

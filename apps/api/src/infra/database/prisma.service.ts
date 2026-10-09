import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { databaseConfig } from '../../config/database.config.js';
import { PrismaClient } from '../../generated/prisma/client.js';

/** Cliente do banco. Os repositories de cada módulo o recebem por injeção. */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(databaseConfig.KEY) config: ConfigType<typeof databaseConfig>,
  ) {
    super({
      adapter: new PrismaPg({
        connectionString: config.url,
        // O padrão do `pg` é esperar para sempre por um banco que não responde.
        connectionTimeoutMillis: config.connectTimeoutMs,
      }),
    });
  }

  // Consulta o banco na subida para a aplicação falhar cedo se ele estiver
  // fora. Só o `$connect()` não basta: com o adapter, ele não abre conexão.
  async onModuleInit(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

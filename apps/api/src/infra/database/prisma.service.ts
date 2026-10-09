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
    super({ adapter: new PrismaPg({ connectionString: config.url }) });
  }

  // Conecta na subida para a aplicação falhar cedo se o banco estiver fora.
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

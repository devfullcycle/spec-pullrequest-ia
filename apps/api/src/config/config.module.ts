import { DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './app.config.js';
import { authConfig } from './auth.config.js';
import { databaseConfig } from './database.config.js';
import { validatedEnv } from './env.js';
import { mailConfig } from './mail.config.js';

interface AppConfigModuleOptions {
  /**
   * Lê só as variáveis do ambiente, sem o arquivo `.env`. É como a aplicação
   * roda em produção, onde o arquivo não existe.
   */
  ignoreEnvFile?: boolean;
}

/**
 * Único ponto de leitura das variáveis de ambiente. Valida tudo contra o schema
 * na subida (a aplicação não inicia com uma variável ausente ou inválida) e
 * entrega os valores por injeção, agrupados por assunto:
 *
 *   constructor(@Inject(mailConfig.KEY) config: ConfigType<typeof mailConfig>)
 */
export class AppConfigModule {
  static forRoot(options: AppConfigModuleOptions = {}): Promise<DynamicModule> {
    return ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: options.ignoreEnvFile ?? false,
      validate: validatedEnv,
      load: [appConfig, authConfig, databaseConfig, mailConfig],
    });
  }
}

import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

interface TestAppOptions {
  /**
   * Controllers que só existem no teste, para exercitar a fundação (formato de
   * erro, validação) sem depender de uma rota de negócio.
   */
  controllers?: Type[];
}

/**
 * Sobe a aplicação inteira, com a mesma configuração do `main.ts`, contra o
 * banco de testes e o Mailpit. Quem chama fecha a aplicação com `app.close()`.
 */
export async function createTestApp(
  options: TestAppOptions = {},
): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configureApp(app);
  try {
    await app.init();
  } catch (error) {
    // Quem chamou não recebe a aplicação para fechar, então ela é fechada aqui.
    // Uma falha ao fechar não pode esconder o motivo de a subida ter falhado.
    await app.close().catch(() => undefined);
    throw error;
  }
  return app;
}

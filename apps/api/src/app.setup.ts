import { INestApplication } from '@nestjs/common';

/** Prefixo e versão de todas as rotas (seção 3.1 do docs/lld.md). */
export const API_PREFIX = 'v1';

/**
 * Configuração da aplicação HTTP que vale tanto para o `main.ts` quanto para a
 * base de testes. O que depende de injeção (filtro de erros, validação de
 * entrada) é registrado no `AppModule`.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
}

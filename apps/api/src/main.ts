import { NestFactory } from '@nestjs/core';
import type { ConfigType } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { appConfig } from './config/app.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // Fecha as conexões quando o contêiner recebe o sinal de parada.
  app.enableShutdownHooks();

  const { port } = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  await app.listen(port);
}
await bootstrap();

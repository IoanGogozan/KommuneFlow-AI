import { NestFactory } from '@nestjs/core';
import './config/env';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  });
  app.setGlobalPrefix('api/v1');

  const port = process.env.API_PORT ?? 3101;
  await app.listen(port);
}
bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

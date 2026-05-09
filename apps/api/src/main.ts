import { NestFactory } from '@nestjs/core';
import './config/env';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = process.env.API_PORT ?? 3101;
  await app.listen(port);
}
bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

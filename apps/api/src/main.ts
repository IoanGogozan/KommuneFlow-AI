import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const port = process.env.API_PORT ?? 3101;
  await app.listen(port);
}
bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { requestLoggingMiddleware } from './shared/middleware/request-logging.middleware';
import { requestIdMiddleware } from './shared/middleware/request-id.middleware';

export function configureApp(app: INestApplication) {
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
}

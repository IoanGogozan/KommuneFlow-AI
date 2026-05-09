import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response, json, urlencoded } from 'express';
import helmet from 'helmet';
import { requestLoggingMiddleware } from './shared/middleware/request-logging.middleware';
import { requestIdMiddleware } from './shared/middleware/request-id.middleware';
import {
  getAllowedOrigins,
  OriginValidationMiddleware,
} from './shared/middleware/origin-validation.middleware';

export function configureApp(app: INestApplication) {
  const originValidationMiddleware = new OriginValidationMiddleware();

  app.use(helmet());
  app.use(json({ limit: process.env.JSON_BODY_LIMIT ?? '1mb' }));
  app.use(
    urlencoded({ extended: true, limit: process.env.FORM_BODY_LIMIT ?? '1mb' }),
  );
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(cookieParser());
  app.use((request: Request, response: Response, next: NextFunction) =>
    originValidationMiddleware.use(request, response, next),
  );
  app.enableCors({
    origin: Array.from(getAllowedOrigins()),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
}

import { INestApplication } from '@nestjs/common';
import { configureApp } from './configure-app';

describe('configureApp', () => {
  it('trusts only local and private reverse-proxy ranges', () => {
    const set = jest.fn();
    const app = {
      getHttpAdapter: () => ({ getInstance: () => ({ set }) }),
      use: jest.fn(),
      enableCors: jest.fn(),
      setGlobalPrefix: jest.fn(),
    } as unknown as INestApplication;

    configureApp(app);

    expect(set).toHaveBeenCalledWith('trust proxy', [
      'loopback',
      'linklocal',
      'uniquelocal',
    ]);
  });
});

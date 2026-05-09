import pino from 'pino';

export const appLogger = pino({
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'authorization',
      'cookie',
      'apiKey',
      'openaiApiKey',
    ],
    remove: true,
  },
});

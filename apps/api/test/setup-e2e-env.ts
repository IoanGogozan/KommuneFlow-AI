process.env.NODE_ENV = 'test';
process.env.AI_PROVIDER = 'mock';
delete process.env.OPENAI_API_KEY;

process.env.JWT_SECRET ??= 'e2e-test-jwt-secret';
process.env.SESSION_SECRET ??= 'e2e-test-session-secret';
process.env.APP_BASE_URL ??= 'http://localhost:3000';
process.env.CORS_ALLOWED_ORIGINS ??= 'http://localhost:3000';

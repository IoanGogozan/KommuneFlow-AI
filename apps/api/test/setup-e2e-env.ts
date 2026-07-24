process.env.NODE_ENV = 'test';
process.env.AI_PROVIDER = 'mock';
delete process.env.OPENAI_API_KEY;

process.env.JWT_SECRET ??= 'e2e-test-jwt-secret';
process.env.SESSION_SECRET ??= 'e2e-test-session-secret';
process.env.APP_BASE_URL ??= 'http://localhost:3000';
process.env.CORS_ALLOWED_ORIGINS ??= 'http://localhost:3000';
process.env.PORTFOLIO_DEMO_ENABLED = 'true';
process.env.PUBLIC_DEMO_ALLOW_UPLOADS = 'true';
process.env.PORTFOLIO_DEMO_ALLOWED_TENANTS =
  'kristiansand,arendal,grimstad,e2e-demo';
process.env.PORTFOLIO_DEMO_DEFAULT_TENANT = 'kristiansand';
process.env.PORTFOLIO_DEMO_SESSION_TTL_SECONDS = '1800';

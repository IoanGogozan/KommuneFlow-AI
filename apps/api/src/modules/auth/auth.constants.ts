export const AUTH_COOKIE_NAME = 'kommuneflow_access_token';
export const AUTH_TOKEN_TTL_SECONDS = 60 * 60;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }

  return 'development-only-jwt-secret';
}

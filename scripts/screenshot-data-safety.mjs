export function assertScreenshotDatabaseSafety(environment) {
  if (environment.NODE_ENV === "production") {
    throw new Error("Screenshot database reset is forbidden in production.");
  }

  if (environment.SCREENSHOT_DATA_ALLOW_RESET !== "true") {
    throw new Error(
      "Set SCREENSHOT_DATA_ALLOW_RESET=true to acknowledge the screenshot-only database reset.",
    );
  }

  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for screenshot generation.");
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  const databaseName = parsed.pathname.slice(1).toLowerCase();
  if (!/(screenshot|test)/.test(databaseName)) {
    throw new Error(
      "Screenshot reset requires a database name containing 'screenshot' or 'test'.",
    );
  }
}

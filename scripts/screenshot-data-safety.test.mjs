import assert from "node:assert/strict";
import test from "node:test";
import { assertScreenshotDatabaseSafety } from "./screenshot-data-safety.mjs";

const safeEnvironment = {
  NODE_ENV: "test",
  SCREENSHOT_DATA_ALLOW_RESET: "true",
  DATABASE_URL: "postgresql://demo:secret@localhost:5432/kommuneflow_screenshot",
};

test("accepts an explicitly acknowledged screenshot-only database", () => {
  assert.doesNotThrow(() => assertScreenshotDatabaseSafety(safeEnvironment));
});

test("refuses production configuration", () => {
  assert.throws(
    () =>
      assertScreenshotDatabaseSafety({
        ...safeEnvironment,
        NODE_ENV: "production",
      }),
    /forbidden in production/,
  );
});

test("refuses normal development databases and missing acknowledgement", () => {
  assert.throws(
    () =>
      assertScreenshotDatabaseSafety({
        ...safeEnvironment,
        DATABASE_URL: "postgresql://demo:secret@localhost:5432/kommuneflow_ai",
      }),
    /database name containing/,
  );
  assert.throws(
    () =>
      assertScreenshotDatabaseSafety({
        ...safeEnvironment,
        SCREENSHOT_DATA_ALLOW_RESET: "false",
      }),
    /SCREENSHOT_DATA_ALLOW_RESET=true/,
  );
});

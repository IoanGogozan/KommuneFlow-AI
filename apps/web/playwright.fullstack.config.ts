import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-fullstack",
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @kommuneflow/api start",
      url: "http://localhost:3101/api/v1/health",
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        AI_PROVIDER: "mock",
      },
    },
    {
      command: "pnpm --filter @kommuneflow/web dev",
      url: "http://localhost:3000/en",
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:3101/api/v1",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PLAYWRIGHT_BROWSER_CHANNEL
          ? { channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL }
          : {}),
      },
    },
  ],
});

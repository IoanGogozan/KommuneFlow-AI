import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { assertScreenshotDatabaseSafety } from "./screenshot-data-safety.mjs";

const baseUrl = trimTrailingSlash(
  process.env.WEB_BASE_URL ?? "http://localhost:3000",
);
const screenshotDir = process.env.SCREENSHOT_DIR ?? "docs/screenshots";
const previewPath =
  process.env.SCREENSHOT_PREVIEW_PATH ??
  "apps/web/public/screenshots/citizen-intake-preview.png";
const seedPassword =
  process.env.SCREENSHOT_SEED_PASSWORD ?? randomBytes(24).toString("base64url");
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;

const forbiddenNb = [
  "Sprak",
  "forstar",
  "loggfores",
  "Prov igjen",
  "kjore",
  "beslutningsstotte",
  "maling",
  "sentralbyra",
];

await mkdir(screenshotDir, { recursive: true });
await mkdir("apps/web/public/screenshots", { recursive: true });

assertScreenshotDatabaseSafety(process.env);
resetScreenshotDatabase();

const browser = await chromium.launch({
  ...(browserChannel ? { channel: browserChannel } : {}),
  headless: true,
});
const screenshots = [];

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });

  await page.goto(`${baseUrl}/en?municipality=kristiansand&portfolio=1`, {
    waitUntil: "networkidle",
  });
  await hideDevelopmentChrome(page);
  await screenshotToPath(page, previewPath);
  await screenshot(page, "02-citizen-intake-preview.png");

  await capture(page, "/", "01-public-landing.png");
  await capture(
    page,
    "/en?municipality=kristiansand&portfolio=1",
    "03-citizen-form.png",
  );
  await assertText(page, "Kristiansand Kommune");
  await assertText(page, "Arendal Kommune");
  await assertText(page, "Grimstad Kommune");
  await assertNoText(page, forbiddenNb);

  const caseReference = await captureSubmissionAndStatus(page);

  await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle" });
  await hideDevelopmentChrome(page);
  await page.getByRole("button", { name: "Enter employee demo" }).click();
  await page.waitForURL(/\/internal/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  const createdCaseQueuePath = `/internal/cases?search=${encodeURIComponent(caseReference)}`;

  await capture(page, "/internal", "06-guest-dashboard.png");
  await assertText(page, "KommuneFlow AI");
  await assertAnyText(page, [
    "Public portfolio session",
    "Offentlig porteføljeøkt",
  ]);

  await capture(page, createdCaseQueuePath, "07-guest-case-queue.png");
  await assertAnyText(page, [
    "These are the cases you are allowed to access",
    "Dette er sakene du har tilgang til",
  ]);

  await openFirstCase(page);
  await screenshot(page, "08-case-overview.png");
  await page.getByRole("button", { name: /AI review|KI-gjennomgang/i }).click();
  await screenshot(page, "09-ai-review.png");
  await page.getByRole("button", { name: /Workflow|Arbeidsflyt/i }).click();
  await screenshot(page, "10-workflow-activity.png");

  await captureAnalytics(page);
  await logout(page);
  await screenshot(page, "12-normal-staff-login.png");

  console.log(
    JSON.stringify(
      {
        status: "ok",
        baseUrl,
        screenshotDir,
        screenshots,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

async function captureSubmissionAndStatus(page) {
  await page.goto(`${baseUrl}/en`, { waitUntil: "networkidle" });
  await hideDevelopmentChrome(page);
  await page.getByRole("combobox").first().selectOption("kristiansand");
  await page.getByLabel("Name").fill("Demo Citizen");
  await page.getByLabel("Email").fill("demo.citizen@example.local");
  await page
    .getByRole("checkbox", { name: /does not concern a specific address/i })
    .check();
  await page.getByLabel("Title").fill("Streetlight not working");
  await page
    .getByLabel("Description")
    .fill(
      "The streetlight beside the synthetic demo address has stopped working.",
    );
  await page.getByRole("checkbox", { name: /Privacy/i }).check();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByText("Request registered").waitFor();
  await screenshot(page, "04-submission-success.png");
  await page.getByRole("button", { name: "Check this case now" }).click();
  await page.getByText("Case status").waitFor();
  await screenshot(page, "05-status-lookup.png");
  return page.getByLabel("Case reference").inputValue();
}

async function captureAnalytics(page) {
  await page.goto(`${baseUrl}/internal/analytics`, {
    waitUntil: "networkidle",
  });
  await hideDevelopmentChrome(page);
  await setRecentAnalyticsRange(page);
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => !document.body.innerText.includes("..."));
  await assertHasNumbers(page);
  await assertNoText(page, ["Aggregate", "Aggreger"]);
  await assertNoText(page, ["Sprak", "Effektmaling", "sentralbyra"]);
  await screenshot(page, "11-analytics-read-only.png");
}

async function capture(page, path, filename, options = {}) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await hideDevelopmentChrome(page);

  if (options.locatorText) {
    await scrollToText(page, options.locatorText);
  }

  await screenshot(page, filename);
}

async function captureOptional(page, path, filename, expectedTexts) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await hideDevelopmentChrome(page);
  const text = await page.locator("body").innerText();

  if (text.includes("You do not have permission")) {
    console.log(`SKIP ${filename}: configured user lacks permission.`);
    return;
  }

  if (expectedTexts.some((expectedText) => text.includes(expectedText))) {
    await screenshot(page, filename);
    return;
  }

  console.log(
    `SKIP ${filename}: page is not available for the configured user.`,
  );
}

async function screenshot(page, filename) {
  await screenshotToPath(page, `${screenshotDir}/${filename}`);
  screenshots.push(filename);
}

async function screenshotToPath(page, path) {
  await page.screenshot({
    path,
    fullPage: false,
    mask: [page.locator("code")],
  });
}

async function logout(page) {
  await page.getByRole("button", { name: /Sign out|Logg ut/i }).click();
  await page.waitForURL("**/internal/login", { timeout: 15000 });
}

async function openFirstCase(page) {
  await page.goto(`${baseUrl}/internal/cases`, { waitUntil: "networkidle" });
  await hideDevelopmentChrome(page);
  const caseLink = page.locator('a[href^="/internal/cases/"]').first();
  const href = await caseLink.getAttribute("href");

  if (!href) {
    throw new Error("Could not find a case detail link on the case list.");
  }

  await caseLink.click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Overview|Oversikt/i }).waitFor();
  await page.getByRole("button", { name: /Overview|Oversikt/i }).click();
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.locator('section[aria-label="Case overview"]').waitFor();
  return href.split("/").at(-1);
}

async function clickIfVisible(page, name) {
  const button = page.getByRole("button", { name }).first();

  if ((await button.count()) > 0 && (await button.isVisible())) {
    await button.click();
    await page.waitForLoadState("networkidle");
  }
}

async function scrollToText(page, text) {
  const locator = page.getByText(text, { exact: false }).first();

  if ((await locator.count()) > 0) {
    await locator.scrollIntoViewIfNeeded();
  }
}

async function hideDevelopmentChrome(page) {
  await page.addStyleTag({
    content:
      'nextjs-portal, [aria-label="Open Next.js Dev Tools"] { display: none !important; }',
  });
}

async function setRecentAnalyticsRange(page) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 2);
  const inputs = page.locator('input[type="date"]');

  if ((await inputs.count()) >= 2) {
    await inputs.nth(0).fill(toDateInputValue(from));
    await inputs.nth(1).fill(toDateInputValue(to));
  }
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

async function assertText(page, expected) {
  const text = await page.locator("body").innerText();
  if (!text.includes(expected)) {
    throw new Error(`Expected page text to include "${expected}".`);
  }
}

async function assertAnyText(page, expectedValues) {
  const text = await page.locator("body").innerText();
  if (!expectedValues.some((expected) => text.includes(expected))) {
    throw new Error(
      `Expected page text to include one of: ${expectedValues.join(", ")}.`,
    );
  }
}

async function assertNoText(page, forbidden) {
  const text = await page.locator("body").innerText();
  const matches = forbidden.filter((item) => text.includes(item));
  if (matches.length > 0) {
    throw new Error(`Unexpected text found: ${matches.join(", ")}`);
  }
}

async function assertHasNumbers(page) {
  const text = await page.locator("body").innerText();
  if (!/\b[1-9][0-9]*\b/.test(text)) {
    throw new Error("Expected dashboard to contain populated numeric metrics.");
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

function resetScreenshotDatabase() {
  const commandEnvironment = {
    ...process.env,
    SEED_DEMO_PASSWORD: seedPassword,
  };

  runPnpm(
    [
      "--filter",
      "@kommuneflow/api",
      "exec",
      "prisma",
      "migrate",
      "reset",
      "--force",
    ],
    commandEnvironment,
  );
  runPnpm(["--filter", "@kommuneflow/api", "prisma:seed"], commandEnvironment);
}

function runPnpm(args, environment) {
  if (process.platform === "win32") {
    execFileSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", `pnpm ${args.join(" ")}`],
      {
        env: environment,
        stdio: "inherit",
      },
    );
    return;
  }

  execFileSync("pnpm", args, {
    env: environment,
    stdio: "inherit",
  });
}

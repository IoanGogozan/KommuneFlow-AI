import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { assertScreenshotDatabaseSafety } from "./screenshot-data-safety.mjs";

const baseUrl = trimTrailingSlash(
  process.env.WEB_BASE_URL ?? "http://localhost:3000",
);
const screenshotDir = process.env.SCREENSHOT_DIR ?? "docs/screenshots";
const demoEmail =
  process.env.DEMO_EMAIL ??
  process.env.SCREENSHOT_EMAIL ??
  "department.admin@kristiansand.local";
const demoPassword =
  process.env.DEMO_PASSWORD ?? process.env.SCREENSHOT_PASSWORD;
const auditEmail =
  process.env.DEMO_AUDIT_EMAIL ?? process.env.SCREENSHOT_AUDIT_EMAIL;
const auditPassword =
  process.env.DEMO_AUDIT_PASSWORD ?? process.env.SCREENSHOT_AUDIT_PASSWORD;
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;

if (!demoPassword) {
  throw new Error(
    "DEMO_PASSWORD or SCREENSHOT_PASSWORD is required. The screenshot script does not hardcode login passwords.",
  );
}

if ((auditEmail && !auditPassword) || (!auditEmail && auditPassword)) {
  throw new Error(
    "Set both DEMO_AUDIT_EMAIL and DEMO_AUDIT_PASSWORD to capture audit/private admin-only pages.",
  );
}

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

const browser = await chromium.launch({
  ...(browserChannel ? { channel: browserChannel } : {}),
  headless: true,
});
const screenshots = [];

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });

  await capture(page, "/", "01-landing.png");
  await capture(page, "/en", "02-citizen-intake-en.png");
  await capture(page, "/nb", "03-citizen-intake-nb.png");
  await assertText(page, "Kristiansand Kommune");
  await assertText(page, "Arendal Kommune");
  await assertText(page, "Grimstad Kommune");
  await assertNoText(page, forbiddenNb);

  await captureSubmissionAndStatus(page);

  await capture(page, "/internal/login", "06-internal-login.png");
  await login(page, demoEmail, demoPassword);

  await capture(page, "/internal", "06-internal-dashboard.png");
  await assertText(page, "KommuneFlow AI");

  await capture(page, "/internal/cases", "07-case-list.png");
  await assertAnyText(page, [
    "These are the cases you are allowed to access",
    "Dette er sakene du har tilgang til",
  ]);

  const caseId = await openFirstCase(page);
  await screenshot(page, "07-case-overview.png");
  await page.getByRole("button", { name: /AI review|KI-gjennomgang/i }).click();
  await screenshot(page, "08-ai-review.png");
  await page.getByRole("button", { name: /Workflow|Arbeidsflyt/i }).click();
  await screenshot(page, "09-workflow-activity.png");

  await captureOptional(page, "/internal/privacy", "10-privacy-dashboard.png", [
    "Privacy",
    "Personvern",
  ]);
  await captureOptional(page, "/internal/audit", "11-audit-dashboard.png", [
    "Audit",
    "Revisjon",
  ]);

  if (auditEmail && auditPassword) {
    await logout(page);
    await login(page, auditEmail, auditPassword);
    await captureOptional(
      page,
      "/internal/audit",
      "12-audit-dashboard-auditor.png",
      ["Audit", "Revisjon"],
    );
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        baseUrl,
        demoEmail,
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
  await page.getByRole("checkbox", { name: /does not concern a specific address/i }).check();
  await page.getByLabel("Title").fill("Streetlight not working");
  await page.getByLabel("Description").fill(
    "The streetlight beside the synthetic demo address has stopped working.",
  );
  await page.getByRole("checkbox", { name: /Privacy/i }).check();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByText("Request registered").waitFor();
  await screenshot(page, "04-submission-success.png");
  await page.getByRole("button", { name: "Check this case now" }).click();
  await page.getByText("Case status").waitFor();
  await screenshot(page, "05-status-lookup.png");
}

async function captureAnalytics(page) {
  await page.goto(`${baseUrl}/internal/analytics`, {
    waitUntil: "networkidle",
  });
  await hideDevelopmentChrome(page);
  await setRecentAnalyticsRange(page);
  await clickIfVisible(page, /Aggregate|Aggreger/i);
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => !document.body.innerText.includes("..."));
  await assertHasNumbers(page);
  await assertNoText(page, ["Sprak", "Effektmaling", "sentralbyra"]);
  await screenshot(page, "08-analytics-dashboard.png");
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
  await page.screenshot({
    path: `${screenshotDir}/${filename}`,
    fullPage: true,
  });
  screenshots.push(filename);
}

async function login(page, email, password) {
  await page.goto(`${baseUrl}/internal/login`, { waitUntil: "networkidle" });
  await hideDevelopmentChrome(page);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /Sign in|Logg inn/i }).click();
  await page.waitForURL(/\/internal(\/cases)?$/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
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
  await page
    .getByRole("button", { name: /Overview|Oversikt/i })
    .waitFor();
  await page
    .getByRole("button", { name: /Overview|Oversikt/i })
    .click();
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.locator('section[aria-label="Case overview"]').waitFor();
  return href.split("/").at(-1);
}

assertScreenshotDatabaseSafety(process.env);
resetScreenshotDatabase();

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
      '[aria-label="Open Next.js Dev Tools"] { display: none !important; }',
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
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const commandEnvironment = {
    ...process.env,
    SEED_DEMO_PASSWORD: demoPassword,
  };

  execFileSync(
    pnpm,
    ["--filter", "@kommuneflow/api", "exec", "prisma", "migrate", "reset", "--force"],
    { env: commandEnvironment, stdio: "inherit" },
  );
  execFileSync(pnpm, ["--filter", "@kommuneflow/api", "prisma:seed"], {
    env: commandEnvironment,
    stdio: "inherit",
  });
}

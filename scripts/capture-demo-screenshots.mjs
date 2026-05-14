import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

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

  await capture(page, "/nb", "01-public-intake-nb.png");
  await assertText(page, "Kristiansand Kommune");
  await assertText(page, "Arendal Kommune");
  await assertText(page, "Grimstad Kommune");
  await assertNoText(page, forbiddenNb);

  await capturePublicStatusLookup(page);

  await capture(page, "/internal/login", "03-internal-login.png");
  await login(page, demoEmail, demoPassword);

  await capture(page, "/internal", "04-internal-overview.png");
  await assertText(page, "KommuneFlow AI");

  await capture(page, "/internal/cases", "05-case-list.png");
  await assertText(page, "These are the cases you are allowed to access");

  const caseId = await openFirstCase(page);
  await screenshot(page, "06-case-detail-documents.png");
  await assertText(page, "Documents");

  await capture(page, `/internal/cases/${caseId}`, "07-ai-triage-section.png", {
    locatorText: "AI triage",
  });

  await captureAnalytics(page);
  await capture(page, "/internal/operations", "09-operations-dashboard.png");

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

async function capturePublicStatusLookup(page) {
  await page.goto(`${baseUrl}/en`, { waitUntil: "networkidle" });
  await hideDevelopmentChrome(page);
  await clickIfVisible(page, /Check existing case/i);
  await assertText(page, "reference");
  await screenshot(page, "02-public-status-lookup.png");
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

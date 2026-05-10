import { chromium } from "playwright";

const baseUrl = process.env.WEB_BASE_URL ?? "http://localhost:3000";
const screenshotDir = "docs/screenshots";
const demoEmail =
  process.env.DEMO_EMAIL ?? "department.admin@kristiansand.local";
const demoPassword = process.env.DEMO_PASSWORD ?? "DemoPassword123!";

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

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
});

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });

  await capture(page, "/nb", "01-citizen-intake-nb.png");
  await assertText(page, "Kristiansand Kommune");
  await assertText(page, "Arendal Kommune");
  await assertText(page, "Grimstad Kommune");
  await assertNoText(page, forbiddenNb);

  await capture(page, "/en", "02-citizen-intake-en-documents.png");
  await assertText(page, "Choose the municipality for this case.");

  await page.goto(`${baseUrl}/internal/login`, { waitUntil: "networkidle" });
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: `${screenshotDir}/03-internal-login.png`,
    fullPage: true,
  });
  await page.locator('input[name="email"]').fill(demoEmail);
  await page.locator('input[name="password"]').fill(demoPassword);
  await page.getByRole("button", { name: /Sign in|Logg inn/i }).click();
  await page.waitForURL("**/internal/cases", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: `${screenshotDir}/04-case-dashboard.png`,
    fullPage: true,
  });

  await page.goto(`${baseUrl}/internal/analytics`, {
    waitUntil: "networkidle",
  });
  await hideDevelopmentChrome(page);
  await setRecentAnalyticsRange(page);
  await page.getByRole("button", { name: /Aggregate|Aggreger/i }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => !document.body.innerText.includes("..."));
  await assertHasNumbers(page);
  await assertNoText(page, ["Sprak", "Effektmaling", "sentralbyra"]);
  await page.screenshot({
    path: `${screenshotDir}/07-analytics-dashboard.png`,
    fullPage: true,
  });

  await page.goto(`${baseUrl}/internal/operations`, {
    waitUntil: "networkidle",
  });
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: `${screenshotDir}/08-operations-dashboard.png`,
    fullPage: true,
  });

  const analyticsText = await page
    .goto(`${baseUrl}/internal/analytics`, { waitUntil: "networkidle" })
    .then(() => page.locator("body").innerText());

  console.log(
    JSON.stringify(
      {
        status: "ok",
        baseUrl,
        demoEmail,
        screenshots: [
          "01-citizen-intake-nb.png",
          "02-citizen-intake-en-documents.png",
          "03-internal-login.png",
          "04-case-dashboard.png",
          "07-analytics-dashboard.png",
          "08-operations-dashboard.png",
        ],
        analyticsHasZeroOnlyLook: !/\b[1-9][0-9]*\b/.test(analyticsText),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

async function capture(page, path, filename) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: `${screenshotDir}/${filename}`,
    fullPage: true,
  });
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

  await inputs.nth(0).fill(toDateInputValue(from));
  await inputs.nth(1).fill(toDateInputValue(to));
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

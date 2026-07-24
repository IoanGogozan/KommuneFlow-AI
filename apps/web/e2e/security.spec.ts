import { expect, test } from "@playwright/test";

test("landing exposes the security trust section and keyboard navigation", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Security is enforced in layers." }),
  ).toBeVisible();
  await expect(page.getByText("Security and trust")).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore security architecture" })).toHaveAttribute(
    "href",
    "/security",
  );
  await expect(page.getByRole("link", { name: "View verification evidence" })).toHaveAttribute(
    "href",
    "/security#verification-links",
  );
  await expect(page.getByRole("heading", { name: "Server-side access control" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Municipality-scoped data" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Human-controlled AI" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Restricted public demo" })).toBeVisible();

  const securityLink = page.getByRole("link", { name: "Security", exact: true });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /KommuneFlow AI/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Workflow" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Engineering" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(securityLink).toBeFocused();
  await securityLink.press("Enter");
  await expect(page).toHaveURL(/#security$/);
});

test("security page is public, accessible, and does not trigger auth requests on load", async ({
  page,
}) => {
  const requestPaths: string[] = [];
  page.on("request", (request) => {
    requestPaths.push(new URL(request.url()).pathname);
  });

  await page.goto("/security");

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Security architecture and trust boundaries",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic data only", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Mock AI in the public deployment", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Restricted guest access", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Not approved for real municipal use", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/independent security review/)).toBeVisible();
  await expect(page.getByText(/enterprise-grade/i)).toHaveCount(0);
  await expect(page.getByText(/GDPR certified/i)).toHaveCount(0);
  await expect(page.getByText(/penetration tested/i)).toHaveCount(0);
  await expect(page.getByText(/Military-grade/i)).toHaveCount(0);
  await expect(page.getByRole("img", { name: /Browser over HTTPS to gateway/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "View source code" })).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.getByRole("link", { name: "View source code" })).toHaveAttribute(
    "rel",
    /noopener/,
  );
  await expect(page.getByRole("link", { name: "View security documentation" })).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.getByRole("link", { name: "View deployment verification" })).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(
    page.getByText(
      "These cells describe role permissions. Portfolio guest edits are still narrowed by backend checks to visitor-created and designated demo cases.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to portfolio", exact: true }),
  ).toHaveAttribute(
    "href",
    "/",
  );

  expect(
    requestPaths.filter((path) => path.includes("/auth/demo-session")),
  ).toHaveLength(0);
  expect(requestPaths.filter((path) => path.includes("/auth/me"))).toHaveLength(
    0,
  );
});

test("landing and security pages avoid horizontal overflow at 320 pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });

  await page.goto("/");
  let dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  await page.goto("/security");
  dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

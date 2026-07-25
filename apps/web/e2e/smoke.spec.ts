import { expect, type Page, type Route, test } from "@playwright/test";

const apiBaseUrl = "http://localhost:3101/api/v1";

test("portfolio landing offers public citizen and one-click employee journeys", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Municipal case management/,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/No account required.*Synthetic data only/),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Try citizen flow" }),
  ).toHaveAttribute("href", "/en?municipality=kristiansand&portfolio=1");
  await expect(
    page.getByRole("button", { name: "Explore employee demo" }),
  ).toBeVisible();
  await expect(page.locator('a[href="/internal/login"]')).toHaveCount(0);

  const citizenCta = page.getByRole("link", { name: "Try citizen flow" });
  await citizenCta.focus();
  await expect(citizenCta).toBeFocused();
});

test("demo page presents citizen, employee, and technical paths without credentials", async ({
  page,
}) => {
  const requestedPaths: string[] = [];
  page.on("request", (request) =>
    requestedPaths.push(new URL(request.url()).pathname),
  );

  await page.goto("/demo");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Choose a product journey",
    }),
  ).toBeVisible();
  expect(requestedPaths).not.toContain("/en");
  expect(requestedPaths).not.toContain("/internal/login");

  const citizen = page.getByRole("link", { name: "Try citizen flow" });
  await expect(citizen).toHaveAttribute(
    "href",
    "/en?municipality=kristiansand&portfolio=1",
  );
  await expect(
    page.getByRole("button", { name: "Enter employee demo" }),
  ).toBeVisible();
  await expect(page.getByText(/credentials required/i)).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Back to portfolio overview" }),
  ).toHaveAttribute("href", "/");
});

test("portfolio landing has no horizontal overflow at 320 pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("public citizen journey continues into the restricted employee demo", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kommuneflow.internal.locale", "en");
  });
  await mockApi(page, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "OPTIONS") {
      return fulfillJson(route, {}, 204);
    }

    if (
      request.method() === "GET" &&
      url.pathname.endsWith(
        "/public/tenants/arendal/integrations/kartverket/address-search",
      )
    ) {
      expect(url.searchParams.get("q")).toBe("Storgata 12");
      return fulfillJson(route, {
        results: [
          {
            normalizedAddress: "Storgata 12, Arendal",
            municipalityCode: "4203",
            municipalityName: "Arendal",
            postalCode: "4836",
            latitude: 58.4612,
            longitude: 8.7724,
          },
        ],
      });
    }

    if (
      request.method() === "POST" &&
      url.pathname.endsWith("/public/tenants/arendal/cases")
    ) {
      const postData = request.postData() ?? "";
      expect(postData).toContain("Water leak near school entrance");
      expect(postData).toContain("Storgata 12, Arendal");
      expect(postData).toContain("citizen-upload.pdf");
      return fulfillJson(
        route,
        {
          caseId: "case_1",
          caseReference: "KF-2026-0001",
          statusAccessCode: "ABC123",
          status: "new",
          createdAt: "2026-05-09T10:00:00.000Z",
        },
        201,
      );
    }

    if (
      request.method() === "POST" &&
      url.pathname.endsWith("/public/tenants/arendal/cases/status")
    ) {
      expect(url.search).toBe("");
      expect(request.postDataJSON()).toEqual({
        caseReference: "KF-2026-0001",
        statusAccessCode: "ABC123",
      });
      return fulfillJson(route, {
        caseReference: "KF-2026-0001",
        title: "Water leak near school entrance",
        status: "waiting_for_citizen",
        createdAt: "2026-05-09T10:00:00.000Z",
        updatedAt: "2026-05-09T12:00:00.000Z",
        assignedDepartmentName: "Technical Department",
      });
    }

    if (
      request.method() === "POST" &&
      url.pathname.endsWith("/auth/demo-session")
    ) {
      expect(request.postDataJSON()).toEqual({ tenantSlug: "arendal" });
      return fulfillJson(route, { user: portfolioGuest() }, 201);
    }

    if (request.method() === "GET" && url.pathname.endsWith("/auth/me")) {
      return fulfillJson(route, portfolioGuest());
    }

    if (request.method() === "GET" && url.pathname.endsWith("/cases")) {
      return fulfillJson(route, [
        {
          id: "case_1",
          caseReference: "KF-2026-0001",
          title: "Water leak near school entrance",
          status: "waiting_for_citizen",
          category: "road_transport",
          urgency: "normal",
          createdAt: "2026-05-09T10:00:00.000Z",
          assignedDepartment: {
            id: "department_1",
            name: "Technical Department",
            slug: "technical-department",
          },
          citizenProfile: {
            name: "Ada Citizen",
            email: "ada@example.local",
          },
        },
      ]);
    }

    if (
      request.method() === "GET" &&
      url.pathname.endsWith("/analytics/summary")
    ) {
      return fulfillJson(route, {}, 503);
    }

    return route.abort("notfound");
  });

  await page.goto("/en?portfolio=1");
  await expect(page.getByText("Public portfolio demo")).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveCount(0);
  await page.getByRole("combobox").first().selectOption("arendal");
  await page.getByLabel("Name").fill("Ada Citizen");
  await page.getByLabel("Email").fill("ada@example.local");
  await page.getByLabel("Phone").fill("+47 40000000");
  await page
    .getByRole("textbox", { name: "Address", exact: true })
    .fill("Storgata 12");
  await page.getByRole("button", { name: "Search address" }).click();
  await page.getByRole("button", { name: /Storgata 12, Arendal/ }).click();
  await page.getByLabel("Title").fill("Water leak near school entrance");
  await page
    .getByLabel("Description")
    .fill(
      "There is a water leak near the school entrance and the road is slippery.",
    );
  await page.locator('input[name="documents"]').setInputFiles({
    name: "citizen-upload.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%EOF"),
  });
  await page.getByRole("checkbox", { name: /Privacy/ }).check();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Request registered")).toBeVisible();
  await expect(page.getByText("KF-2026-0001")).toBeVisible();
  await expect(page.getByText("ABC123")).toBeVisible();

  await page.getByRole("button", { name: "Check this case now" }).click();
  await expect(page.getByLabel("Case reference")).toHaveValue("KF-2026-0001");
  await expect(page.getByLabel("Access code")).toHaveValue("ABC123");
  await expect(page).not.toHaveURL(/ABC123/);

  await expect(page.getByText("Water leak near school entrance")).toBeVisible();
  await expect(page.getByText("Waiting for you")).toBeVisible();
  await expect(page.getByText("Technical Department")).toBeVisible();

  await page.getByRole("button", { name: "Continue in employee demo" }).click();
  await expect(page).toHaveURL(/\/internal\/cases\?search=KF-2026-0001$/);
  await expect(page).not.toHaveURL(/ABC123/);
  await expect(page.getByText("Public portfolio session")).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveValue("KF-2026-0001");
  await expect(page.getByText("Water leak near school entrance")).toBeVisible();
  await expect(page.getByRole("link", { name: "Operations" })).toHaveCount(0);
  await expect(page.getByText(/Administration/)).toHaveCount(0);
  await page.getByRole("link", { name: "Analytics" }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Analytics" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Aggregate" })).toHaveCount(0);
});

test("internal login posts credentials and redirects to case list", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kommuneflow.internal.locale", "en");
  });
  await mockApi(page, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "OPTIONS") {
      return fulfillJson(route, {}, 204);
    }

    if (request.method() === "POST" && url.pathname.endsWith("/auth/login")) {
      expect(request.postDataJSON()).toEqual({
        email: "worker@example.local",
        password: "correct-password",
      });
      return fulfillJson(route, { user: internalUser() }, 201);
    }

    if (request.method() === "GET" && url.pathname.endsWith("/auth/me")) {
      return fulfillJson(route, internalUser());
    }

    if (request.method() === "GET" && url.pathname.endsWith("/cases")) {
      return fulfillJson(route, [
        {
          id: "case_1",
          title: "Water leak near school entrance",
          status: "triage_pending",
          category: "road_transport",
          urgency: "normal",
          createdAt: "2026-05-09T10:00:00.000Z",
          assignedDepartment: {
            id: "department_1",
            name: "Technical Department",
            slug: "technical-department",
          },
          citizenProfile: { name: "Ada Citizen" },
        },
      ]);
    }

    return route.abort("notfound");
  });

  await page.goto("/internal/login");
  await page.getByLabel("Email").fill("worker@example.local");
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/internal\/cases$/);
  await expect(page.getByText("Water leak near school entrance")).toBeVisible();
});

test("internal case detail supports status update, document upload, and AI review", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kommuneflow.internal.locale", "en");
  });
  const state = {
    status: "triage_pending",
    documents: [
      {
        id: "doc_citizen",
        originalFileName: "citizen-upload.pdf",
        mimeType: "application/pdf",
        sizeBytes: 12,
        checksumSha256: "checksum",
        isSensitive: false,
        createdAt: "2026-05-09T10:00:00.000Z",
        uploadedBy: null,
        uploadedByCitizenProfile: { name: "Ada Citizen" },
      },
    ] as CaseDocument[],
    aiResult: null as AiResult | null,
  };

  await mockApi(page, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "OPTIONS") {
      return fulfillJson(route, {}, 204);
    }

    if (request.method() === "GET" && url.pathname.endsWith("/auth/me")) {
      return fulfillJson(route, internalUser());
    }

    if (request.method() === "GET" && url.pathname.endsWith("/cases/case_1")) {
      return fulfillJson(route, caseDetail(state.status));
    }

    if (
      request.method() === "GET" &&
      url.pathname.endsWith("/cases/case_1/documents")
    ) {
      return fulfillJson(route, state.documents);
    }

    if (
      request.method() === "GET" &&
      url.pathname.endsWith("/cases/case_1/ai-triage/latest")
    ) {
      return fulfillJson(route, state.aiResult);
    }

    if (
      request.method() === "GET" &&
      url.pathname.endsWith("/cases/case_1/activity")
    ) {
      return fulfillJson(route, [
        {
          id: "audit_1",
          action: "case.status_updated",
          entityType: "case",
          entityId: "case_1",
          createdAt: "2026-05-09T12:00:00.000Z",
          actor: {
            id: "user_1",
            name: "Case Worker",
            email: "worker@example.local",
            role: "department_admin",
          },
          metadataSummary: {},
        },
      ]);
    }

    if (request.method() === "GET" && url.pathname.endsWith("/departments")) {
      return fulfillJson(route, [
        {
          id: "department_1",
          name: "Technical Department",
          slug: "technical-department",
        },
      ]);
    }

    if (
      request.method() === "PATCH" &&
      url.pathname.endsWith("/cases/case_1/status")
    ) {
      expect(request.postDataJSON()).toEqual({ status: "in_progress" });
      state.status = "in_progress";
      return fulfillJson(route, caseDetail(state.status));
    }

    if (
      request.method() === "POST" &&
      url.pathname.endsWith("/cases/case_1/documents")
    ) {
      expect(request.postData() ?? "").toContain("internal-note.pdf");
      state.documents.push({
        id: "doc_internal",
        originalFileName: "internal-note.pdf",
        mimeType: "application/pdf",
        sizeBytes: 16,
        checksumSha256: "checksum-internal",
        isSensitive: false,
        createdAt: "2026-05-09T12:30:00.000Z",
        uploadedBy: { name: "Case Worker", role: "department_admin" },
        uploadedByCitizenProfile: null,
      });
      return fulfillJson(route, state.documents.at(-1), 201);
    }

    if (
      request.method() === "POST" &&
      url.pathname.endsWith("/cases/case_1/ai-triage")
    ) {
      state.aiResult = aiResult("completed");
      return fulfillJson(route, state.aiResult, 201);
    }

    if (
      request.method() === "POST" &&
      url.pathname.endsWith("/cases/case_1/ai-triage/ai_1/review")
    ) {
      const reviewPayload = request.postDataJSON();
      expect(reviewPayload).toMatchObject({
        approvedCategory: "road_transport",
        approvedDepartmentSlug: "technical-department",
        approvedUrgency: "high",
        wasAiSuggestionAccepted: true,
      });
      state.status = "triaged";
      state.aiResult = aiResult("reviewed");
      return fulfillJson(route, { id: "review_1" }, 201);
    }

    return route.abort("notfound");
  });

  await page.goto("/internal/cases/case_1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page
      .locator("section")
      .filter({ hasText: "KF-2026-0001" })
      .getByRole("heading", { name: "Water leak near school entrance" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Overview" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "Workflow" }).click();
  await page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: "Status" }) })
    .getByRole("combobox")
    .selectOption("in_progress");
  await page.getByRole("button", { name: "Save status change" }).click();
  await expect(page.getByText("In progress").first()).toBeVisible();

  await page.getByRole("button", { name: "Overview" }).click();
  await page.locator('input[name="file"]').setInputFiles({
    name: "internal-note.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\ninternal\n%EOF"),
  });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("internal-note.pdf")).toBeVisible();

  await page.getByRole("button", { name: "AI review" }).click();
  await page.getByRole("button", { name: "Run AI triage" }).click();
  await expect(page.getByText("AI suggestion ready")).toBeVisible();
  await page
    .getByRole("button", { name: "Accept AI suggestion and mark triaged" })
    .click();
  await expect(
    page.getByText("AI review saved. The case is marked as triaged."),
  ).toBeVisible();
});

test("internal analytics guest view stays compact and avoids advanced staff sections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addInitScript(() => {
    window.localStorage.setItem("kommuneflow.internal.locale", "en");
  });

  await mockApi(page, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "OPTIONS") {
      return fulfillJson(route, {}, 204);
    }

    if (request.method() === "GET" && url.pathname.endsWith("/auth/me")) {
      return fulfillJson(route, portfolioGuest());
    }

    if (
      request.method() === "GET" &&
      url.pathname.endsWith("/analytics/summary")
    ) {
      return fulfillJson(route, {
        from: "2026-05-01",
        to: "2026-05-31",
        totals: {
          totalCases: 3,
          casesByStatus: {
            new: 1,
            closed: 1,
            waiting_for_citizen: 1,
          },
          casesByCategory: {
            building_case: 2,
            road_transport: 1,
          },
          casesByDepartment: {
            technical_department: 2,
            unassigned: 1,
          },
          aiReviewsTotal: 3,
          aiCorrectionsTotal: 2,
          aiCorrectionRate: 2 / 3,
          averageTimeToTriageMinutes: 40 / 3,
          medianTimeToTriageMinutes: 15,
          averageTimeToCloseHours: 14 / 3,
          medianTimeToCloseHours: 5,
          casesWaitingForCitizen: 1,
          aiTriageSuccessCount: 3,
          aiTriageFailureCount: 1,
          aiTriageFailureRate: 0.25,
          aiSuggestionsAccepted: 1,
          aiSuggestionAcceptanceRate: 1 / 3,
          estimatedManualMinutesSaved: 9,
          casesPer1000Inhabitants: (3 / 46568) * 1000,
        },
        sampleSizes: {
          aiReviews: 3,
          aiTriageRuns: 4,
          triageDurations: 3,
          closeDurations: 3,
        },
        assumptions: {
          acceptedAiSuggestionMinutesSaved: 5,
          correctedAiSuggestionMinutesSaved: 2,
          estimatedManualMinutesSavedLabel:
            "Illustrative time-saving assumption, not a measured result.",
        },
        analyticsLastRebuiltAt: "2026-05-09T12:00:00.000Z",
        ssbEnrichment: {
          status: "available",
          populationUsed: 46568,
          populationYear: 2026,
          casesPer1000Inhabitants: (3 / 46568) * 1000,
          lastImportedAt: "2026-05-09T10:00:00.000Z",
        },
        daily: [],
      });
    }

    return route.abort("notfound");
  });

  await page.goto("/internal/analytics");

  await expect(
    page.getByRole("heading", { level: 1, name: "Analytics" }),
  ).toBeVisible();
  await expect(page.getByText("Synthetic analytics snapshot")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Workflow snapshot" }),
  ).toBeVisible();
  await expect(page.getByText("Accepted / corrected reviews")).toBeVisible();
  await expect(page.getByText("Failed triage runs")).toBeVisible();
  await expect(page.getByRole("button", { name: "Aggregate" })).toHaveCount(0);
  await expect(page.getByText("Daily volume")).toHaveCount(0);
  await expect(page.getByText("SSB enrichment")).toHaveCount(0);
  await expect(page.getByText("Illustrative minutes saved")).toHaveCount(0);
  await expect(page.getByText("Reference: SSB table 07459")).toHaveCount(0);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("internal analytics staff view keeps detailed metrics and rebuild controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kommuneflow.internal.locale", "en");
  });

  await mockApi(page, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "OPTIONS") {
      return fulfillJson(route, {}, 204);
    }

    if (request.method() === "GET" && url.pathname.endsWith("/auth/me")) {
      return fulfillJson(route, {
        ...internalUser(),
        role: "super_admin",
        permissions: ["analytics:read", "analytics:aggregate"],
      });
    }

    if (
      request.method() === "GET" &&
      url.pathname.endsWith("/analytics/summary")
    ) {
      return fulfillJson(route, {
        from: "2026-05-01",
        to: "2026-05-31",
        totals: {
          totalCases: 3,
          casesByStatus: {
            new: 1,
            closed: 1,
            waiting_for_citizen: 1,
          },
          casesByCategory: {
            building_case: 2,
            road_transport: 1,
          },
          casesByDepartment: {
            technical_department: 2,
            unassigned: 1,
          },
          aiReviewsTotal: 3,
          aiCorrectionsTotal: 2,
          aiCorrectionRate: 2 / 3,
          averageTimeToTriageMinutes: 40 / 3,
          medianTimeToTriageMinutes: 15,
          averageTimeToCloseHours: 14 / 3,
          medianTimeToCloseHours: 5,
          casesWaitingForCitizen: 1,
          aiTriageSuccessCount: 3,
          aiTriageFailureCount: 1,
          aiTriageFailureRate: 0.25,
          aiSuggestionsAccepted: 1,
          aiSuggestionAcceptanceRate: 1 / 3,
          estimatedManualMinutesSaved: 9,
          casesPer1000Inhabitants: (3 / 46568) * 1000,
        },
        sampleSizes: {
          aiReviews: 3,
          aiTriageRuns: 4,
          triageDurations: 3,
          closeDurations: 3,
        },
        assumptions: {
          acceptedAiSuggestionMinutesSaved: 5,
          correctedAiSuggestionMinutesSaved: 2,
          estimatedManualMinutesSavedLabel:
            "Illustrative time-saving assumption, not a measured result.",
        },
        analyticsLastRebuiltAt: "2026-05-09T12:00:00.000Z",
        ssbEnrichment: {
          status: "available",
          populationUsed: 46568,
          populationYear: 2026,
          casesPer1000Inhabitants: (3 / 46568) * 1000,
          lastImportedAt: "2026-05-09T10:00:00.000Z",
        },
        daily: [
          {
            date: "2026-05-01",
            totalCases: 3,
            aiCorrectionRate: 2 / 3,
            aiTriageFailureRate: 0.25,
            estimatedManualMinutesSaved: 9,
            casesPer1000Inhabitants: (3 / 46568) * 1000,
            ssbDataStatus: "available",
          },
        ],
      });
    }

    return route.abort("notfound");
  });

  await page.goto("/internal/analytics");

  await expect(
    page.getByRole("heading", { level: 1, name: "Analytics" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Aggregate" })).toBeVisible();
  await expect(page.getByText("Illustrative minutes saved")).toBeVisible();
  await expect(page.getByText("Reference: SSB table 07459")).toBeVisible();
  await expect(page.getByText("Daily volume")).toBeVisible();
  await expect(page.getByText("SSB enrichment")).toBeVisible();
  await expect(
    page.getByText("Sample size is below 30 observations"),
  ).toHaveCount(3);
});

async function mockApi(
  page: Page,
  handler: (route: Route) => Promise<void> | void,
) {
  await page.route(`${apiBaseUrl}/**`, handler);
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: {
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Origin": "http://localhost:3000",
      "Content-Type": "application/json",
    },
    body: status === 204 ? "" : JSON.stringify(body),
  });
}

function internalUser() {
  return {
    id: "user_1",
    email: "worker@example.local",
    name: "Case Worker",
    role: "department_admin",
    tenantId: "tenant_1",
    tenant: { id: "tenant_1", name: "Arendal Kommune", slug: "arendal" },
    departmentId: "department_1",
    department: {
      id: "department_1",
      name: "Technical Department",
      slug: "technical-department",
    },
    permissions: [
      "case:read:department",
      "case:update:department",
      "document:upload",
      "document:read:department",
      "ai:triage:run",
      "ai:triage:review",
    ],
  };
}

function portfolioGuest() {
  return {
    id: "guest_1",
    email: "portfolio.guest@arendal.local",
    name: "Portfolio Guest",
    role: "portfolio_guest",
    tenantId: "tenant_1",
    tenant: { id: "tenant_1", name: "Arendal Kommune", slug: "arendal" },
    departmentId: null,
    department: null,
    permissions: [
      "case:read:all_tenant",
      "case:update:all_tenant",
      "document:read:department",
      "ai:triage:run",
      "ai:triage:review",
      "analytics:read",
    ],
  };
}

function caseDetail(status: string) {
  return {
    id: "case_1",
    caseReference: "KF-2026-0001",
    title: "Water leak near school entrance",
    description:
      "There is a water leak near the school entrance and the road is slippery.",
    category: "road_transport",
    status,
    urgency: "high",
    createdAt: "2026-05-09T10:00:00.000Z",
    citizenProfile: {
      name: "Ada Citizen",
      email: "ada@example.local",
      address: "Storgata 12, Arendal",
    },
    addresses: [
      {
        id: "address_1",
        originalInput: "Storgata 12",
        normalizedAddress: "Storgata 12, Arendal",
        municipalityCode: "4203",
        municipalityName: "Arendal",
        postalCode: "4836",
        latitude: 58.4612,
        longitude: 8.7724,
        source: "kartverket",
        sourceReferenceId: "addr_1",
        validationStatus: "validated",
        validatedAt: "2026-05-09T10:00:00.000Z",
      },
    ],
    assignedDepartment: {
      id: "department_1",
      name: "Technical Department",
      slug: "technical-department",
    },
    internalNotes: [],
  };
}

type AiResult = ReturnType<typeof aiResult>;

type CaseDocument = {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  isSensitive: boolean;
  createdAt: string;
  uploadedBy: { name: string; role: string } | null;
  uploadedByCitizenProfile: { name: string } | null;
};

function aiResult(status: "completed" | "reviewed") {
  return {
    id: "ai_1",
    model: "mock",
    promptVersion: "case-triage-v1",
    suggestedCategory: "road_transport",
    suggestedUrgency: "high",
    summary: "Water leak makes the school entrance unsafe.",
    missingInformationJson: [],
    confidenceScore: 0.91,
    reasoningSummary: "Road safety and municipal maintenance are involved.",
    status,
    failureReason: null,
    createdAt: "2026-05-09T12:00:00.000Z",
    suggestedDepartment: {
      slug: "technical-department",
      name: "Technical Department",
    },
  };
}

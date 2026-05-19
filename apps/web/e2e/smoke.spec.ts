import { expect, type Page, type Route, test } from "@playwright/test";

const apiBaseUrl = "http://localhost:3101/api/v1";

test("public citizen intake and status lookup work through the browser", async ({
  page,
}) => {
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
      request.method() === "GET" &&
      url.pathname.endsWith("/public/tenants/arendal/cases/status")
    ) {
      expect(url.searchParams.get("caseReference")).toBe("KF-2026-0001");
      expect(url.searchParams.get("statusAccessCode")).toBe("ABC123");
      return fulfillJson(route, {
        caseReference: "KF-2026-0001",
        title: "Water leak near school entrance",
        status: "waiting_for_citizen",
        createdAt: "2026-05-09T10:00:00.000Z",
        updatedAt: "2026-05-09T12:00:00.000Z",
        assignedDepartmentName: "Technical Department",
      });
    }

    return route.abort("notfound");
  });

  await page.goto("/en");
  await page.getByRole("combobox").first().selectOption("arendal");
  await page.getByLabel("Name").fill("Ada Citizen");
  await page.getByLabel("Email").fill("ada@example.local");
  await page.getByLabel("Phone").fill("+47 40000000");
  await page.getByLabel("Address").fill("Storgata 12");
  await page.getByRole("button", { name: "Search address" }).click();
  await page.getByRole("button", { name: "Confirm address" }).click();
  await page.getByLabel("Title").fill("Water leak near school entrance");
  await page
    .getByLabel("Description")
    .fill(
      "There is a water leak near the school entrance and the road is slippery.",
    );
  await page
    .locator('input[name="documents"]')
    .setInputFiles({
      name: "citizen-upload.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%EOF"),
    });
  await page.getByRole("checkbox", { name: /Privacy/ }).check();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Request registered")).toBeVisible();
  await expect(page.getByText("KF-2026-0001")).toBeVisible();
  await expect(page.getByText("ABC123")).toBeVisible();

  await page.getByRole("button", { name: "Check status" }).click();
  await page.getByLabel("Case reference").fill("KF-2026-0001");
  await page.getByLabel("Access code").fill("ABC123");
  await page.getByRole("button", { name: "Check status" }).click();

  await expect(page.getByText("Water leak near school entrance")).toBeVisible();
  await expect(page.getByText("Waiting for you")).toBeVisible();
  await expect(page.getByText("Technical Department")).toBeVisible();
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
  await expect(
    page
      .locator("section")
      .filter({ hasText: "case_1" })
      .getByRole("heading", { name: "Water leak near school entrance" }),
  ).toBeVisible();

  await page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: "Status" }) })
    .getByRole("combobox")
    .selectOption("in_progress");
  await page.getByRole("button", { name: "Save status change" }).click();
  await expect(page.getByText("In progress").first()).toBeVisible();

  await page
    .locator('input[name="file"]')
    .setInputFiles({
      name: "internal-note.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\ninternal\n%EOF"),
    });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("internal-note.pdf")).toBeVisible();

  await page.getByRole("button", { name: "Run AI triage" }).click();
  await expect(page.getByText("AI suggestion ready")).toBeVisible();
  await page
    .getByRole("button", { name: "Accept AI suggestion and mark triaged" })
    .click();
  await expect(
    page.getByText("AI review saved. The case is marked as triaged."),
  ).toBeVisible();
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

function caseDetail(status: string) {
  return {
    id: "case_1",
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

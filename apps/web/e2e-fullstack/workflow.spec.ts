import { expect, request as playwrightRequest, test } from "@playwright/test";

const api = "http://localhost:3101/api/v1";

test("real citizen and employee workflow keeps AI suggestions separate until review", async ({
  page,
  request,
}) => {
  await expect((await request.get(`${api}/health`)).ok()).toBe(true);
  await expect((await request.get(`${api}/readiness`)).ok()).toBe(true);
  await page.goto("/en");
  await expect(
    page.getByRole("heading", { name: "Submit a request" }),
  ).toBeVisible();

  const unique = Date.now().toString(36);
  const title = `Synthetic full-stack request ${unique}`;
  const intake = await request.post(
    `${api}/public/tenants/kristiansand/cases`,
    {
      multipart: {
        payload: JSON.stringify({
          citizen: {
            name: "Synthetic CI Citizen",
            email: `synthetic-${unique}@example.test`,
            phone: "+47 40000000",
            address: "Synthetic test address",
          },
          case: {
            title,
            description:
              "A synthetic water leak report for deterministic full-stack CI verification.",
            sourceLanguage: "en",
          },
          privacyAccepted: true,
        }),
      },
    },
  );
  expect(intake.status()).toBe(201);
  const created = (await intake.json()) as {
    caseId: string;
    caseReference: string;
    statusAccessCode: string;
  };
  expect(created.caseReference).toBeTruthy();
  expect(created.statusAccessCode).toBeTruthy();

  const status = await request.post(
    `${api}/public/tenants/kristiansand/cases/status`,
    {
      data: {
        caseReference: created.caseReference,
        statusAccessCode: created.statusAccessCode,
      },
    },
  );
  expect(status.ok()).toBe(true);

  const employee = await playwrightRequest.newContext({
    baseURL: `${api}/`,
    extraHTTPHeaders: { Origin: "http://localhost:3000" },
  });
  const login = await employee.post("auth/login", {
    data: {
      email: "department.admin@kristiansand.local",
      password: process.env.FULLSTACK_DEMO_PASSWORD ?? "DemoPassword123!",
    },
  });
  expect(login.status()).toBe(201);
  const cases = (await (await employee.get("cases")).json()) as Array<{
    id: string;
    title: string;
  }>;
  expect(
    cases.some((item) => item.id === created.caseId && item.title === title),
  ).toBe(true);

  const before = (await (
    await employee.get(`cases/${created.caseId}`)
  ).json()) as {
    category: string;
    urgency: string;
  };
  const triageResponse = await employee.post(
    `cases/${created.caseId}/ai-triage`,
  );
  expect(triageResponse.status()).toBe(201);
  const suggestion = (await triageResponse.json()) as {
    id: string;
    suggestedCategory: string;
    suggestedUrgency: string;
    suggestedDepartment: { slug: string } | null;
  };
  const stillOfficial = (await (
    await employee.get(`cases/${created.caseId}`)
  ).json()) as {
    category: string;
    urgency: string;
  };
  expect(stillOfficial).toMatchObject(before);

  const review = await employee.post(
    `cases/${created.caseId}/ai-triage/${suggestion.id}/review`,
    {
      data: {
        approvedCategory: suggestion.suggestedCategory,
        approvedUrgency: suggestion.suggestedUrgency,
        approvedDepartmentSlug: suggestion.suggestedDepartment?.slug,
        wasAiSuggestionAccepted: true,
      },
    },
  );
  expect(review.status()).toBe(201);
  const after = (await (
    await employee.get(`cases/${created.caseId}`)
  ).json()) as {
    category: string;
    urgency: string;
  };
  expect(after.category).toBe(suggestion.suggestedCategory);
  expect(after.urgency).toBe(suggestion.suggestedUrgency);
  await employee.dispose();
});

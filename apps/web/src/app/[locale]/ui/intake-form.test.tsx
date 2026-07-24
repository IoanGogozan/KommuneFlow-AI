import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/lib/i18n";
import { IntakeForm } from "./intake-form";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("IntakeForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("marks portfolio mode and continues with the same tenant and case reference", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          caseId: "case_1",
          caseReference: "KF-2026-0001",
          statusAccessCode: "ABC123",
          status: "new",
          createdAt: "2026-05-09T10:00:00.000Z",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ user: { role: "portfolio_guest" } }));
    const user = userEvent.setup();

    render(
      <IntakeForm
        dictionary={dictionaries.en}
        locale="en"
        initialTenantSlug="arendal"
        portfolioMode
      />,
    );

    expect(screen.getByText("Public portfolio demo")).toBeVisible();
    expect(
      screen.getByText(/This is a shared synthetic demo/),
    ).toBeVisible();
    await user.type(screen.getByLabelText("Name"), "Ada Citizen");
    await user.type(screen.getByLabelText("Email"), "ada@example.local");
    await user.type(screen.getByLabelText("Title"), "Synthetic request");
    await user.type(
      screen.getByLabelText("Description"),
      "A synthetic request used to test the portfolio continuation.",
    );
    await user.click(screen.getByRole("checkbox", { name: /Privacy/ }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await user.click(
      await screen.findByRole("button", {
        name: "Continue in employee demo",
      }),
    );

    expect(fetch).toHaveBeenLastCalledWith(
      "http://localhost:3101/api/v1/auth/demo-session",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ tenantSlug: "arendal" }),
      }),
    );
    expect(pushMock).toHaveBeenCalledWith(
      "/internal/cases?search=KF-2026-0001",
    );
    expect(pushMock.mock.calls[0][0]).not.toContain("ABC123");
    expect(screen.getByText("ABC123")).toBeVisible();
  });

  it("keeps the public heading and introduction aligned with the active tab", async () => {
    const user = userEvent.setup();
    render(<IntakeForm dictionary={dictionaries.en} locale="en" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Submit a request" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Describe your case and the municipality will register it for processing.",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Check existing case" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Check a case" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Enter your case reference and access code to view its current status.",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Submit new request" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Submit a request" }),
    ).toBeVisible();
  });

  it("uses the intended section and success copy without incorrect Bokmål phrases", () => {
    const serialized = JSON.stringify(dictionaries);
    expect(serialized).not.toContain("til a registrere");
    expect(serialized).not.toContain("for a se status");
    expect(dictionaries.en.sectionContactTitle).toBe(
      "Municipality and contact",
    );
    expect(dictionaries.en.sectionDocumentsTitle).toBe(
      "Supporting documents",
    );
    expect(dictionaries.nb.sectionSubmitTitle).toBe("Bekreft og send inn");
    expect(dictionaries.en.successNextStepsText).toContain(
      "Check this case now",
    );
  });

  it("starts without a municipality and only accepts valid explicit preselection", () => {
    const { rerender } = render(
      <IntakeForm dictionary={dictionaries.en} locale="en" />,
    );
    expect(screen.getAllByRole("combobox")[0]).toHaveValue("");

    rerender(
      <IntakeForm
        key="invalid"
        dictionary={dictionaries.en}
        locale="en"
        initialTenantSlug="not-a-tenant"
      />,
    );
    expect(screen.getAllByRole("combobox")[0]).toHaveValue("");

    rerender(
      <IntakeForm
        key="valid"
        dictionary={dictionaries.en}
        locale="en"
        initialTenantSlug="arendal"
      />,
    );
    expect(screen.getAllByRole("combobox")[0]).toHaveValue("arendal");
  });

  it("shows multiple addresses, selects a non-first result, and clears it on municipality change", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        results: [
          {
            normalizedAddress: "Storgata 10, Arendal",
            municipalityCode: "4203",
            municipalityName: "Arendal",
            postalCode: "4836",
          },
          {
            normalizedAddress: "Storgata 12, Arendal",
            municipalityCode: "4203",
            municipalityName: "Arendal",
            postalCode: "4836",
          },
        ],
      }),
    );
    const user = userEvent.setup();
    render(
      <IntakeForm
        dictionary={dictionaries.en}
        locale="en"
        initialTenantSlug="arendal"
      />,
    );

    await user.type(screen.getByLabelText("Address"), "Storgata");
    await user.click(screen.getByRole("button", { name: "Search address" }));
    expect(
      await screen.findByRole("button", { name: /Storgata 10/ }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Storgata 12/ }));
    expect(screen.getByText("Address confirmed")).toBeVisible();

    await user.selectOptions(screen.getAllByRole("combobox")[0], "grimstad");
    expect(screen.queryByText("Address confirmed")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Address")).toHaveValue("");
  });

  it("supports no-address mode and lists and removes selected documents", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <IntakeForm
        dictionary={dictionaries.en}
        locale="en"
        initialTenantSlug="arendal"
      />,
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "This request does not concern a specific address",
      }),
    );

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["one"], "one.pdf", { type: "application/pdf" }),
          new File(["two"], "two.png", { type: "image/png" }),
        ],
      },
    });
    expect(screen.getByText("one.pdf")).toBeVisible();
    expect(screen.getByText("two.png")).toBeVisible();
    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(screen.queryByText("one.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("two.png")).toBeVisible();
  });

  it("explains and removes citizen uploads when the public flag is disabled", () => {
    const { container } = render(
      <IntakeForm
        dictionary={dictionaries.en}
        locale="en"
        initialTenantSlug="arendal"
        portfolioMode
        uploadsAllowed={false}
      />,
    );

    expect(
      screen.getByText(
        "File uploads are disabled in the public portfolio environment. Seeded employee cases include document examples.",
      ),
    ).toBeVisible();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("uses correct Bokmål characters", () => {
    const norwegianText = JSON.stringify(dictionaries.nb);
    expect(norwegianText).toContain("å");
    expect(norwegianText).toContain("ø");
    expect(norwegianText).toContain("Søk");
    expect(norwegianText).toContain("oppfølging");
  });

  it("submits public intake as multipart payload with confirmed address and document", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              normalizedAddress: "Storgata 12, Arendal",
              municipalityCode: "4203",
              municipalityName: "Arendal",
              postalCode: "4836",
              latitude: 58.46,
              longitude: 8.77,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          caseId: "case_1",
          caseReference: "KF-2026-0001",
          statusAccessCode: "ABC123",
          status: "new",
          createdAt: "2026-05-09T10:00:00.000Z",
        }),
      );
    const user = userEvent.setup();

    const { container } = render(
      <IntakeForm dictionary={dictionaries.en} locale="en" />,
    );

    await user.selectOptions(screen.getAllByRole("combobox")[0], "arendal");
    await user.type(screen.getByLabelText("Name"), "Ada Citizen");
    await user.type(screen.getByLabelText("Email"), "ada@example.local");
    await user.type(screen.getByLabelText("Phone"), "+47 40000000");
    await user.type(screen.getByLabelText("Address"), "Storgata 12");
    await user.click(screen.getByRole("button", { name: "Search address" }));
    await user.click(
      await screen.findByRole("button", { name: /Storgata 12, Arendal/ }),
    );
    await user.type(screen.getByLabelText("Title"), "Water leak near school");
    await user.type(
      screen.getByLabelText("Description"),
      "There is a water leak by the school entrance and children may slip.",
    );
    const documentFile = new File(["%PDF-1.4"], "leak.pdf", {
      type: "application/pdf",
    });
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [documentFile],
    });
    fireEvent.change(fileInput);
    await user.click(screen.getByRole("checkbox", { name: /Privacy/ }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await screen.findByText("Request registered");
    expect(screen.getByText("KF-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3101/api/v1/public/tenants/arendal/integrations/kartverket/address-search?q=Storgata%2012",
    );
    const submitUrl = fetchMock.mock.calls[1][0];
    const submitInit = fetchMock.mock.calls[1][1] as RequestInit;
    const body = submitInit.body as FormData;
    const payload = JSON.parse(String(body.get("payload")));

    expect(submitUrl).toBe(
      "http://localhost:3101/api/v1/public/tenants/arendal/cases",
    );
    expect(submitInit.method).toBe("POST");
    expect(payload).toMatchObject({
      citizen: {
        name: "Ada Citizen",
        email: "ada@example.local",
        phone: "+47 40000000",
        address: "Storgata 12, Arendal",
      },
      case: {
        title: "Water leak near school",
        sourceLanguage: "en",
      },
      privacyAccepted: true,
    });
    expect((body.getAll("documents")[0] as File).name).toBe("leak.pdf");
  });

  it("shows status lookup result and does not leak data on failed lookups", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          caseReference: "KF-2026-0001",
          title: "Water leak near school",
          status: "waiting_for_citizen",
          createdAt: "2026-05-09T10:00:00.000Z",
          updatedAt: "2026-05-09T12:00:00.000Z",
          assignedDepartmentName: "Technical Department",
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const user = userEvent.setup();

    render(
      <IntakeForm
        dictionary={dictionaries.en}
        locale="en"
        initialTenantSlug="kristiansand"
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Check existing case" }));
    await user.type(screen.getByLabelText("Case reference"), "KF-2026-0001");
    await user.type(screen.getByLabelText("Access code"), "ABC123");
    await user.click(screen.getByRole("button", { name: "Check status" }));

    await screen.findByText("Water leak near school");
    expect(screen.getByText("Waiting for you")).toBeInTheDocument();
    expect(screen.getByText("Technical Department")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]).toEqual([
      "http://localhost:3101/api/v1/public/tenants/kristiansand/cases/status",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          caseReference: "KF-2026-0001",
          statusAccessCode: "ABC123",
        }),
      }),
    ]);

    await user.clear(screen.getByLabelText("Case reference"));
    await user.type(screen.getByLabelText("Case reference"), "KF-2026-BAD");
    await user.click(screen.getByRole("button", { name: "Check status" }));

    expect(
      await screen.findByText("No case was found with that combination."),
    ).toBeInTheDocument();
    const result = screen.queryByText("Water leak near school");
    expect(result).not.toBeInTheDocument();
  });

  it("surfaces address and submit failures with user-safe messages", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(new Response(null, { status: 400 }));
    const user = userEvent.setup();

    render(
      <IntakeForm
        dictionary={dictionaries.en}
        locale="en"
        initialTenantSlug="kristiansand"
      />,
    );

    await user.type(screen.getByLabelText("Address"), "Bad address");
    await user.click(screen.getByRole("button", { name: "Search address" }));
    expect(
      await screen.findByText("Could not validate the address right now."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "Ada Citizen");
    await user.type(screen.getByLabelText("Email"), "ada@example.local");
    await user.type(screen.getByLabelText("Title"), "Water leak near school");
    await user.type(
      screen.getByLabelText("Description"),
      "There is a water leak by the school entrance and children may slip.",
    );
    await user.click(screen.getByRole("checkbox", { name: /Privacy/ }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByText("Could not submit the request. Please try again."),
    ).toBeInTheDocument();
  });

  it("can move from success into status lookup with the returned reference visible", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          caseId: "case_1",
          caseReference: "KF-2026-0001",
          statusAccessCode: "ABC123",
          status: "new",
          createdAt: "2026-05-09T10:00:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          caseReference: "KF-2026-0001",
          title: "Water leak near school",
          status: "new",
          createdAt: "2026-05-09T10:00:00.000Z",
          updatedAt: "2026-05-09T10:00:00.000Z",
          assignedDepartmentName: null,
        }),
      );
    const user = userEvent.setup();

    render(
      <IntakeForm
        dictionary={dictionaries.en}
        locale="en"
        initialTenantSlug="kristiansand"
      />,
    );

    await user.type(screen.getByLabelText("Name"), "Ada Citizen");
    await user.type(screen.getByLabelText("Email"), "ada@example.local");
    await user.type(screen.getByLabelText("Title"), "Water leak near school");
    await user.type(
      screen.getByLabelText("Description"),
      "There is a water leak by the school entrance and children may slip.",
    );
    await user.click(screen.getByRole("checkbox", { name: /Privacy/ }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    const successPanel = await screen.findByText("Request registered");
    expect(successPanel).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Check this case now" }),
    );

    const statusForm = screen.getByRole("button", { name: "Check status" }).closest("form")!;
    expect(within(statusForm).getByLabelText("Case reference")).toHaveValue(
      "KF-2026-0001",
    );
    expect(within(statusForm).getByLabelText("Access code")).toHaveValue(
      "ABC123",
    );
    expect(await screen.findByText("Water leak near school")).toBeVisible();
  });

  it("copies success values and handles clipboard rejection without persistence", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        caseId: "case_1",
        caseReference: "KF-2026-0001",
        statusAccessCode: "ABC123",
        status: "new",
        createdAt: "2026-05-09T10:00:00.000Z",
      }),
    );
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    render(
      <IntakeForm
        dictionary={dictionaries.en}
        locale="en"
        initialTenantSlug="arendal"
      />,
    );
    await user.type(screen.getByLabelText("Name"), "Ada Citizen");
    await user.type(screen.getByLabelText("Email"), "ada@example.local");
    await user.type(screen.getByLabelText("Title"), "Water leak near school");
    await user.type(
      screen.getByLabelText("Description"),
      "There is a water leak by the school entrance and children may slip.",
    );
    await user.click(screen.getByRole("checkbox", { name: /Privacy/ }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await user.click(await screen.findByRole("button", { name: "Copy reference" }));
    expect(writeText).toHaveBeenCalledWith("KF-2026-0001");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");

    writeText.mockRejectedValueOnce(new Error("denied"));
    await user.click(screen.getByRole("button", { name: "Copy access code" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Could not copy. Select and copy the value manually.",
    );
    expect(window.location.search).not.toContain("ABC123");
    expect(localStorage.getItem("statusAccessCode")).toBeNull();
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/lib/i18n";
import { IntakeForm } from "./intake-form";

describe("IntakeForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
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
      await screen.findByRole("button", { name: "Confirm address" }),
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

    render(<IntakeForm dictionary={dictionaries.en} locale="en" />);

    await user.click(screen.getByRole("tab", { name: "Check existing case" }));
    await user.type(screen.getByLabelText("Case reference"), "KF-2026-0001");
    await user.type(screen.getByLabelText("Access code"), "ABC123");
    await user.click(screen.getByRole("button", { name: "Check status" }));

    await screen.findByText("Water leak near school");
    expect(screen.getByText("Waiting for you")).toBeInTheDocument();
    expect(screen.getByText("Technical Department")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:3101/api/v1/public/tenants/kristiansand/cases/status?caseReference=KF-2026-0001&statusAccessCode=ABC123",
    );

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

    render(<IntakeForm dictionary={dictionaries.en} locale="en" />);

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

    render(<IntakeForm dictionary={dictionaries.en} locale="en" />);

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
    await user.click(screen.getByRole("button", { name: "Check status" }));

    const statusForm = screen.getByRole("button", { name: "Check status" })
      .closest("form")!;
    expect(within(statusForm).getByLabelText("Case reference")).toBeInTheDocument();
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

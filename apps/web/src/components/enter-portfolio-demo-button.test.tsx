import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnterPortfolioDemoButton } from "./enter-portfolio-demo-button";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("EnterPortfolioDemoButton", () => {
  beforeEach(() => {
    push.mockReset();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("creates a cookie session and redirects to the internal workspace", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            role: "portfolio_guest",
            tenant: { slug: "kristiansand" },
          },
        }),
        { status: 201 },
      ),
    );
    render(<EnterPortfolioDemoButton locale="en" tenantSlug="kristiansand" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Explore employee demo" }),
    );

    expect(
      screen.getByRole("button", { name: "Entering demo…" }),
    ).toBeDisabled();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/internal"));
    expect(window.localStorage.getItem("kommuneflow.internal.locale")).toBe(
      "en",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3101/api/v1/auth/demo-session",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ tenantSlug: "kristiansand" }),
      }),
    );
  });

  it("supports a case-reference destination without access data in the URL", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 201 }),
    );
    render(
      <EnterPortfolioDemoButton
        redirectTo="/internal/cases?search=KF-2026-0001"
        tenantSlug="arendal"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Explore employee demo" }),
    );

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/internal/cases?search=KF-2026-0001"),
    );
    expect(push.mock.calls[0][0]).not.toContain("ABC123");
  });

  it("shows a retryable error when the demo is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 503 }),
    );
    render(<EnterPortfolioDemoButton />);

    fireEvent.click(
      screen.getByRole("button", { name: "Explore employee demo" }),
    );

    expect(
      await screen.findByText("Demo temporarily unavailable"),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InternalLoginForm } from "./internal-login-form";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("InternalLoginForm", () => {
  beforeEach(() => {
    window.localStorage.setItem("kommuneflow.internal.locale", "en");
    vi.stubGlobal("fetch", vi.fn());
    pushMock.mockReset();
  });

  it("posts credentials with cookies enabled and redirects to cases on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 201 }));
    const user = userEvent.setup();

    render(<InternalLoginForm />);

    await user.type(screen.getByLabelText("Email"), "worker@example.local");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3101/api/v1/auth/login",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "worker@example.local",
          password: "correct-password",
        }),
      },
    );
    expect(pushMock).toHaveBeenCalledWith("/internal/cases");
  });

  it("shows a generic login error and does not redirect on failed credentials", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }));
    const user = userEvent.setup();

    render(<InternalLoginForm />);

    await user.type(screen.getByLabelText("Email"), "worker@example.local");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});

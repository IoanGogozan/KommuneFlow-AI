import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { internalDictionaryEn } from "@/lib/internal-i18n-en";
import type { InternalCurrentUser } from "@/lib/internal-user";
import { InternalShell } from "./internal-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/internal/cases",
  useRouter: () => ({ push: vi.fn() }),
}));

function user(
  role: string,
  permissions: InternalCurrentUser["permissions"],
): InternalCurrentUser {
  return {
    id: "user_1",
    email: "worker@example.local",
    name: "Demo Worker",
    role,
    tenantId: "tenant_1",
    tenant: { id: "tenant_1", name: "Arendal", slug: "arendal" },
    departmentId: "department_1",
    department: { id: "department_1", name: "Technical", slug: "technical" },
    permissions,
  };
}

function shell(currentUser: InternalCurrentUser) {
  return (
    <InternalShell
      currentUser={currentUser}
      locale="en"
      setLocale={vi.fn()}
      t={internalDictionaryEn}
      title="Cases"
    >
      <p>Content</p>
    </InternalShell>
  );
}

describe("InternalShell navigation", () => {
  it("shows a case worker only the permitted work navigation", () => {
    render(shell(user("case_worker", ["case:read:own"])));

    expect(screen.getAllByRole("link", { name: "Cases" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Administration ▾")).not.toBeInTheDocument();
    expect(screen.queryByText("Governance ▾")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Analytics" })).not.toBeInTheDocument();
  });

  it("groups governance and administration without changing visibility", () => {
    render(
      shell(
        user("super_admin", [
          "case:read:all_tenant",
          "analytics:read",
          "operations:read",
          "audit:read",
          "privacy:export",
          "tenant:manage",
          "routing_rules:manage",
          "user:manage",
        ]),
      ),
    );

    expect(screen.getByText("Governance ▾")).toBeVisible();
    expect(screen.getByText("Administration ▾")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Operations" }).length).toBeGreaterThan(0);
  });

  it("exposes an accessible mobile disclosure", async () => {
    const userEventApi = userEvent.setup();
    render(shell(user("auditor", ["case:read:all_tenant", "audit:read"])));

    const menu = screen.getByRole("button", { name: "Menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    await userEventApi.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "Internal mobile" })).toBeVisible();
  });
});

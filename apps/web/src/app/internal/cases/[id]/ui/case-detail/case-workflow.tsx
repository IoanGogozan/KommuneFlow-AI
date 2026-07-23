import type { ReactNode } from "react";

export function CaseWorkflow({ children }: { children: ReactNode }) {
  return <section aria-label="Case workflow">{children}</section>;
}

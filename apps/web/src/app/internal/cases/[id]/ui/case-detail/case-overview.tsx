import type { ReactNode } from "react";

export function CaseOverview({ children }: { children: ReactNode }) {
  return <section aria-label="Case overview">{children}</section>;
}

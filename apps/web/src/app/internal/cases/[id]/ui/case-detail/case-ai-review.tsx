import type { ReactNode } from "react";

export function CaseAiReview({ children }: { children: ReactNode }) {
  return <section aria-label="AI review">{children}</section>;
}

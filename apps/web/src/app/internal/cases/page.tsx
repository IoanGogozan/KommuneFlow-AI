import { Suspense } from "react";
import { CasesDashboard } from "./ui/cases-dashboard";

export default function InternalCasesPage() {
  return (
    <Suspense fallback={null}>
      <CasesDashboard />
    </Suspense>
  );
}

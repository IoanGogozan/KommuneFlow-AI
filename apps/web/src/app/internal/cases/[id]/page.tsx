import { CaseDetail } from "./ui/case-detail";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InternalCaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CaseDetail caseId={id} />;
}

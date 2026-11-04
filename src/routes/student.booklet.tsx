import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/AppShell";
import { ReportBooklet } from "@/components/booklet/ReportBooklet";

export const Route = createFileRoute("/student/booklet")({
  validateSearch: (search: Record<string, unknown>) => ({
    reportId: typeof search.reportId === "string" ? search.reportId : undefined,
    assignmentId: typeof search.assignmentId === "string" ? search.assignmentId : undefined,
  }),
  component: StudentBooklet,
});

function StudentBooklet() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Practical report"
        description="Complete the fields defined by your Technologist."
      />
      <ReportBooklet
        reportId={search.reportId}
        assignmentId={search.assignmentId}
        onReportCreated={(reportId) =>
          void navigate({ to: "/student/booklet", search: { reportId } })
        }
      />
    </div>
  );
}

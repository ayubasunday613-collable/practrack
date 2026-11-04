import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  FlaskConical,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { SubmissionsTable } from "@/components/app/SubmissionsTable";
import { EmptyState } from "@/components/common/ui-bits";
import { PracticalManager } from "@/components/app/PracticalManager";
import { StudentManager } from "@/components/app/StudentManager";
import { ReportReview } from "@/components/app/ReportReview";

const pages = {
  students: {
    title: "Students",
    icon: Users,
    text: "Approve registrations and manage student records once accounts are connected.",
    cta: "Invite students",
  },
  courses: {
    title: "Courses",
    icon: BookOpen,
    text: "Organise courses by department and level.",
    cta: "Add course",
  },
  practicals: {
    title: "Manage Practicals",
    icon: FlaskConical,
    text: "Create practicals and assign them to courses.",
    cta: "Create practical",
  },
  submissions: { title: "Report Submissions", icon: ClipboardCheck, text: "", cta: "" },
  "ai-grading": {
    title: "AI Grading Setup",
    icon: Sparkles,
    text: "Marking criteria are defined on each practical. Configure AI_API_KEY and AI_MODEL as Supabase Edge Function secrets; AI suggestions never become final marks without Technologist approval.",
    cta: "",
  },
  "grade-approval": {
    title: "Grade Approval",
    icon: ClipboardCheck,
    text: "Reviewed assessments awaiting your final approval will appear here.",
    cta: "",
  },
  reports: {
    title: "Assessment Reports",
    icon: BarChart3,
    text: "Continuous assessment summaries and exports per course.",
    cta: "",
  },
  notifications: { title: "Notifications", icon: Bell, text: "You're all caught up.", cta: "" },
  settings: {
    title: "Settings",
    icon: Settings,
    text: "Institution, department and account preferences.",
    cta: "",
  },
} as const;

export const Route = createFileRoute("/technologist/$section")({
  validateSearch: (search: Record<string, unknown>) => ({
    reportId: typeof search.reportId === "string" ? search.reportId : undefined,
  }),
  loader: ({ params }) => {
    if (!(params.section in pages)) throw notFound();
  },
  component: Section,
});

function Section() {
  const { section } = Route.useParams();
  const { reportId } = Route.useSearch();
  const p = pages[section as keyof typeof pages];
  return (
    <>
      <PageHeader title={p.title} />
      {section === "practicals" ? (
        <PracticalManager />
      ) : section === "students" ? (
        <StudentManager />
      ) : section === "submissions" ? (
        <SubmissionsTable />
      ) : section === "grade-approval" ? (
        <ReportReview reportId={reportId} />
      ) : (
        <EmptyState
          icon={p.icon}
          title={p.title}
          description={
            p.text ||
            "This workspace will show records after practicals are created and students submit reports."
          }
        />
      )}
    </>
  );
}

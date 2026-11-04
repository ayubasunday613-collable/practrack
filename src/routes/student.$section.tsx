import { createFileRoute, notFound } from "@tanstack/react-router";
import { User } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { StudentPracticals } from "@/components/app/StudentPracticals";
import { StudentAssessmentResults } from "@/components/app/StudentAssessmentResults";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState, SectionCard } from "@/components/common/ui-bits";

const pages = {
  practicals: { title: "My Practicals", desc: "Practicals assigned to your approved account." },
  reports: { title: "My Reports", desc: "Report sheets for your assigned practicals." },
  submissions: { title: "Submissions", desc: "Reports you have sent for Technologist review." },
  grades: { title: "My Grades", desc: "Only Technologist-approved marks appear here." },
  "ai-feedback": {
    title: "AI Feedback",
    desc: "AI suggestions are reviewed before marks are released.",
  },
  profile: { title: "My Profile", desc: "Your registered student details." },
} as const;

export const Route = createFileRoute("/student/$section")({
  loader: ({ params }) => {
    if (!(params.section in pages)) throw notFound();
  },
  component: Section,
});

function Section() {
  const { section } = Route.useParams();
  const page = pages[section as keyof typeof pages];
  const { profile, session } = useAuth();

  return (
    <>
      <PageHeader title={page.title} description={page.desc} />
      {section === "practicals" || section === "reports" ? (
        <StudentPracticals mode={section} />
      ) : section === "submissions" ? (
        <StudentPracticals mode="submissions" />
      ) : section === "grades" ? (
        <StudentAssessmentResults />
      ) : section === "ai-feedback" ? (
        <StudentAssessmentResults feedbackOnly />
      ) : (
        <SectionCard title="Student profile">
          {profile ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {Object.entries({
                "Full name": profile.full_name,
                "Matric number": profile.matric_number,
                Department: profile.department,
                Programme: profile.programme,
                Level: profile.level,
                Email: session?.user.email ?? "",
              }).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState
              icon={User}
              title="Profile unavailable"
              description="Your student profile could not be loaded."
            />
          )}
        </SectionCard>
      )}
    </>
  );
}

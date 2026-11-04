import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ClipboardCheck, FlaskConical, Inbox, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/AppShell";
import { SectionCard, StatCard } from "@/components/common/ui-bits";
import { SubmissionsTable } from "@/components/app/SubmissionsTable";
import { requireSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/technologist/")({ component: AdminOverview });

function AdminOverview() {
  const [counts, setCounts] = useState({
    students: 0,
    practicals: 0,
    submissions: 0,
    reviews: 0,
    approved: 0,
  });

  useEffect(() => {
    let active = true;
    const loadCounts = async () => {
      try {
        const client = requireSupabaseClient();
        const [students, practicals, submissions, reviews, approved] = await Promise.all([
          client
            .from("profiles")
            .select("user_id", { count: "exact", head: true })
            .eq("role", "student"),
          client
            .from("practicals")
            .select("id", { count: "exact", head: true })
            .eq("status", "active"),
          client
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("status", "submitted"),
          client
            .from("ai_assessments")
            .select("id", { count: "exact", head: true })
            .eq("status", "completed")
            .is("approved_at", null),
          client
            .from("ai_assessments")
            .select("id", { count: "exact", head: true })
            .not("approved_at", "is", null),
        ]);
        const error =
          students.error ??
          practicals.error ??
          submissions.error ??
          reviews.error ??
          approved.error;
        if (error) throw error;
        if (active) {
          setCounts({
            students: students.count ?? 0,
            practicals: practicals.count ?? 0,
            submissions: submissions.count ?? 0,
            reviews: reviews.count ?? 0,
            approved: approved.count ?? 0,
          });
        }
      } catch (error) {
        console.error("Could not load Technologist dashboard counts.", error);
        toast.error("Dashboard counts could not be loaded", {
          description: error instanceof Error ? error.message : "Try refreshing the page.",
        });
      }
    };
    void loadCounts();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Technologist overview"
        description="A fresh workspace. Create and assign practicals to get started."
        actions={
          <Button asChild variant="accent">
            <Link to="/technologist/$section" params={{ section: "practicals" }}>
              Create a practical
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard inverted icon={Users} label="Registered Students" value={counts.students} />
        <StatCard
          inverted
          icon={FlaskConical}
          label="Active Practicals"
          value={counts.practicals}
        />
        <StatCard inverted icon={Inbox} label="New Submissions" value={counts.submissions} />
        <StatCard inverted icon={ClipboardCheck} label="Pending Reviews" value={counts.reviews} />
        <StatCard
          inverted
          icon={CheckCircle2}
          label="Approved Assessments"
          value={counts.approved}
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SubmissionsTable />
        <SectionCard title="Student registrations">
          <p className="text-sm text-muted-foreground">
            {counts.students === 0
              ? "No students registered yet."
              : `${counts.students} student accounts are registered.`}
          </p>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link to="/technologist/$section" params={{ section: "students" }}>
              Review student accounts
            </Link>
          </Button>
        </SectionCard>
      </div>
    </>
  );
}

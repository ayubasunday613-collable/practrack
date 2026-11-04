import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Clock, FilePen, FlaskConical, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/AppShell";
import { EmptyState, SectionCard, StatCard } from "@/components/common/ui-bits";
import { StudentPracticals } from "@/components/app/StudentPracticals";
import { useAuth } from "@/components/auth/AuthProvider";
import { requireSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/student/")({ component: Overview });

function Overview() {
  const { profile, session } = useAuth();
  const [counts, setCounts] = useState({
    practicals: 0,
    drafts: 0,
    submitted: 0,
    awaiting: 0,
    approved: 0,
  });

  useEffect(() => {
    if (!session) return;
    let active = true;
    const loadCounts = async () => {
      try {
        const client = requireSupabaseClient();
        const [practicals, drafts, submitted, awaiting, approved] = await Promise.all([
          client
            .from("assignments")
            .select("id", { count: "exact", head: true })
            .eq("student_id", session.user.id),
          client
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("student_id", session.user.id)
            .eq("status", "draft"),
          client
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("student_id", session.user.id)
            .neq("status", "draft"),
          client
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("student_id", session.user.id)
            .in("status", ["submitted", "reviewed"]),
          client
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("student_id", session.user.id)
            .eq("status", "approved"),
        ]);
        const error =
          practicals.error ?? drafts.error ?? submitted.error ?? awaiting.error ?? approved.error;
        if (error) throw error;
        if (active) {
          setCounts({
            practicals: practicals.count ?? 0,
            drafts: drafts.count ?? 0,
            submitted: submitted.count ?? 0,
            awaiting: awaiting.count ?? 0,
            approved: approved.count ?? 0,
          });
        }
      } catch (error) {
        console.error("Could not load student dashboard counts.", error);
        toast.error("Dashboard counts could not be loaded", {
          description: error instanceof Error ? error.message : "Try refreshing the page.",
        });
      }
    };
    void loadCounts();
    return () => {
      active = false;
    };
  }, [session]);

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile?.full_name.split(" ")[0] ?? "Student"}`}
        description={`${profile?.department ?? "Your department"} · ${profile?.level ?? "Student workspace"}`}
        actions={
          <Button asChild variant="outline">
            <Link to="/student/$section" params={{ section: "practicals" }}>
              View my practicals
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={FlaskConical} label="Assigned Practicals" value={counts.practicals} />
        <StatCard icon={FilePen} label="Draft Reports" value={counts.drafts} />
        <StatCard icon={Send} label="Submitted Reports" value={counts.submitted} />
        <StatCard icon={Clock} label="Awaiting Assessment" value={counts.awaiting} />
        <StatCard icon={Award} label="Approved Grades" value={counts.approved} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StudentPracticals mode="practicals" />
        <SectionCard title="Recent activity">
          <EmptyState
            icon={Clock}
            title="No activity yet"
            description="Your report activity will appear here after you start an assigned practical."
          />
        </SectionCard>
      </div>
    </>
  );
}

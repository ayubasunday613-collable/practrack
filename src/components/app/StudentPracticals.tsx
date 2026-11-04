import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionCard } from "@/components/common/ui-bits";
import { useAuth } from "@/components/auth/AuthProvider";
import { requireSupabaseClient } from "@/lib/supabase";

type AssignedPractical = {
  assignmentId: string;
  practicalId: string;
  title: string;
  courseCode: string;
  status: string;
  reportId: string | null;
};

export function StudentPracticals({ mode }: { mode: "practicals" | "reports" | "submissions" }) {
  const { session } = useAuth();
  const [items, setItems] = useState<AssignedPractical[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const client = requireSupabaseClient();
    const { data: assignments, error } = await client
      .from("assignments")
      .select("id,practical_id")
      .eq("student_id", session.user.id);
    if (error) {
      setLoading(false);
      console.error("Could not load student practical assignments.", error);
      toast.error("Your practicals could not be loaded", { description: error.message });
      return;
    }

    if (!assignments?.length) {
      setItems([]);
      setLoading(false);
      return;
    }

    const [practicalResult, reportResult] = await Promise.all([
      client
        .from("practicals")
        .select("id,title,course_code")
        .in(
          "id",
          assignments.map((a) => a.practical_id),
        ),
      client
        .from("reports")
        .select("id,assignment_id,status")
        .in(
          "assignment_id",
          assignments.map((a) => a.id),
        ),
    ]);
    setLoading(false);
    if (practicalResult.error || reportResult.error) {
      const loadError = practicalResult.error ?? reportResult.error;
      console.error("Could not load assigned practical details.", loadError);
      toast.error("Your practical details could not be loaded", {
        description: loadError?.message,
      });
      return;
    }

    const practicalById = new Map(
      (practicalResult.data ?? []).map((practical) => [practical.id, practical]),
    );
    const reportByAssignment = new Map(
      (reportResult.data ?? []).map((report) => [report.assignment_id, report]),
    );
    const assignedItems = assignments.flatMap((assignment) => {
      const practical = practicalById.get(assignment.practical_id);
      if (!practical) return [];
      const report = reportByAssignment.get(assignment.id);
      return [
        {
          assignmentId: assignment.id,
          practicalId: practical.id,
          title: practical.title,
          courseCode: practical.course_code,
          status: report?.status ?? "not started",
          reportId: report?.id ?? null,
        },
      ];
    });
    setItems(
      mode === "submissions"
        ? assignedItems.filter((item) => item.reportId && item.status !== "draft")
        : assignedItems,
    );
  }, [mode, session]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SectionCard
      title={
        mode === "practicals"
          ? "Assigned practicals"
          : mode === "submissions"
            ? "Submitted reports"
            : "My report sheets"
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your assignments…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={
            mode === "practicals"
              ? "No practicals assigned"
              : mode === "submissions"
                ? "No reports submitted"
                : "No report sheets yet"
          }
          description={
            mode === "submissions"
              ? "Submitted reports appear here while they are being assessed and reviewed."
              : "A practical will appear here after a Technologist assigns it to your approved account."
          }
        />
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li
              key={item.assignmentId}
              className="flex flex-wrap items-stretch justify-between gap-3 py-4 sm:items-center"
            >
              <div className="flex items-center gap-3">
                {mode === "practicals" ? (
                  <FlaskConical className="size-4 text-accent-brand" />
                ) : (
                  <FileText className="size-4 text-accent-brand" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">
                    {item.courseCode || "Practical"} · {item.status}
                  </p>
                  <p className="font-medium">{item.title}</p>
                </div>
              </div>
              <Button asChild className="min-h-11 w-full sm:w-auto" variant="default">
                <Link
                  to="/student/booklet"
                  search={
                    item.reportId
                      ? { reportId: item.reportId, assignmentId: undefined }
                      : { reportId: undefined, assignmentId: item.assignmentId }
                  }
                >
                  {item.reportId ? "Open report" : "Start report"}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

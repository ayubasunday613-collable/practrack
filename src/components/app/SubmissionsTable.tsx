import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, SectionCard, StatusBadge } from "@/components/common/ui-bits";
import { statusMeta, type SubmissionStatus } from "@/lib/sample-data";
import { requireSupabaseClient } from "@/lib/supabase";

type Submission = {
  id: string;
  student: string;
  matric: string;
  practical: string;
  date: string;
  status: SubmissionStatus;
};

export function SubmissionsTable() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubmissions = useCallback(async () => {
    const client = requireSupabaseClient();
    setLoading(true);
    const { data: reports, error } = await client
      .from("reports")
      .select("id,assignment_id,student_id,status,submitted_at")
      .neq("status", "draft")
      .order("submitted_at", { ascending: false });
    if (error) {
      setLoading(false);
      console.error("Could not load report submissions.", error);
      toast.error("Report submissions could not be loaded", { description: error.message });
      return;
    }
    if (!reports?.length) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const [profileResult, assignmentResult] = await Promise.all([
      client
        .from("profiles")
        .select("user_id,full_name,matric_number")
        .in(
          "user_id",
          reports.map((report) => report.student_id),
        ),
      client
        .from("assignments")
        .select("id,practical_id")
        .in(
          "id",
          reports.map((report) => report.assignment_id),
        ),
    ]);
    if (profileResult.error || assignmentResult.error) {
      const error = profileResult.error ?? assignmentResult.error;
      setLoading(false);
      console.error("Could not load report student and assignment details.", error);
      toast.error("Report details could not be loaded", { description: error?.message });
      return;
    }
    const practicalIds = (assignmentResult.data ?? []).map((assignment) => assignment.practical_id);
    const practicalResult = practicalIds.length
      ? await client.from("practicals").select("id,title").in("id", practicalIds)
      : { data: [], error: null };
    if (practicalResult.error) {
      setLoading(false);
      console.error("Could not load report practical titles.", practicalResult.error);
      toast.error("Practical details could not be loaded", {
        description: practicalResult.error.message,
      });
      return;
    }

    const profiles = new Map(
      (profileResult.data ?? []).map((profile) => [profile.user_id, profile]),
    );
    const assignments = new Map(
      (assignmentResult.data ?? []).map((assignment) => [assignment.id, assignment]),
    );
    const practicals = new Map(
      (practicalResult.data ?? []).map((practical) => [practical.id, practical]),
    );
    setSubmissions(
      reports.map((report) => {
        const profile = profiles.get(report.student_id);
        const assignment = assignments.get(report.assignment_id);
        const practical = assignment ? practicals.get(assignment.practical_id) : undefined;
        return {
          id: report.id,
          student: profile?.full_name ?? "Student",
          matric: profile?.matric_number ?? "",
          practical: practical?.title ?? "Practical",
          date: report.submitted_at ? new Date(report.submitted_at).toLocaleDateString() : "—",
          status: report.status as SubmissionStatus,
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const rows = useMemo(
    () =>
      submissions.filter(
        (submission) =>
          (status === "all" || submission.status === status) &&
          `${submission.student} ${submission.matric} ${submission.practical}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, status, submissions],
  );

  return (
    <SectionCard title="Report submissions">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search submissions"
            placeholder="Search student, matric or practical"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(statusMeta)
              .filter(([key]) => key !== "draft")
              .map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading reports…</p>
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No reports submitted"
          description="Reports will appear here after assigned students submit their practical work."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Student</th>
                <th className="font-medium">Matric no.</th>
                <th className="font-medium">Practical</th>
                <th className="font-medium">Submitted</th>
                <th className="font-medium">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((submission) => (
                <tr key={submission.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-3 font-medium">{submission.student}</td>
                  <td className="text-muted-foreground">{submission.matric}</td>
                  <td>{submission.practical}</td>
                  <td className="text-muted-foreground">{submission.date}</td>
                  <td>
                    <StatusBadge status={submission.status} />
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void navigate({
                          to: "/technologist/$section",
                          params: { section: "grade-approval" },
                          search: { reportId: submission.id },
                        })
                      }
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No submissions match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

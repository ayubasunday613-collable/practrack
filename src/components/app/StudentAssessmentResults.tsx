import { useCallback, useEffect, useState } from "react";
import { Award, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, SectionCard } from "@/components/common/ui-bits";
import { useAuth } from "@/components/auth/AuthProvider";
import { requireSupabaseClient } from "@/lib/supabase";

type ApprovedResult = {
  reportId: string;
  practicalTitle: string;
  total: number;
  feedback: string;
  fields: Array<{
    title: string;
    finalPoints: number;
    feedback: string;
    technologistFeedback: string | null;
  }>;
};

export function StudentAssessmentResults({ feedbackOnly = false }: { feedbackOnly?: boolean }) {
  const { session } = useAuth();
  const [results, setResults] = useState<ApprovedResult[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const client = requireSupabaseClient();
    const { data: reports, error } = await client
      .from("reports")
      .select("id,assignment_id")
      .eq("student_id", session.user.id)
      .eq("status", "approved");
    if (error) {
      setLoading(false);
      console.error("Could not load approved student grades.", error);
      toast.error("Approved marks could not be loaded", { description: error.message });
      return;
    }
    if (!reports?.length) {
      setResults([]);
      setLoading(false);
      return;
    }

    const { data: assessments, error: assessmentError } = await client
      .from("ai_assessments")
      .select("id,report_id,final_total,feedback")
      .in(
        "report_id",
        reports.map((report) => report.id),
      )
      .not("approved_at", "is", null);
    if (assessmentError) {
      setLoading(false);
      console.error("Could not load Technologist-approved assessment results.", assessmentError);
      toast.error("Assessment feedback could not be loaded", {
        description: assessmentError.message,
      });
      return;
    }
    const [assignmentResult, itemResult] = await Promise.all([
      client
        .from("assignments")
        .select("id,practical_id")
        .in(
          "id",
          reports.map((report) => report.assignment_id),
        ),
      client
        .from("ai_assessment_items")
        .select("*")
        .in(
          "assessment_id",
          (assessments ?? []).map((assessment) => assessment.id),
        ),
    ]);
    if (assignmentResult.error || itemResult.error) {
      const error = assignmentResult.error ?? itemResult.error;
      setLoading(false);
      console.error("Could not load assessment detail.", error);
      toast.error("Assessment details could not be loaded", { description: error?.message });
      return;
    }
    const practicalIds = (assignmentResult.data ?? []).map((assignment) => assignment.practical_id);
    const { data: practicals, error: practicalError } = practicalIds.length
      ? await client.from("practicals").select("id,title").in("id", practicalIds)
      : { data: [], error: null };
    if (practicalError) {
      setLoading(false);
      console.error("Could not load practical titles for grades.", practicalError);
      toast.error("Practical names could not be loaded", { description: practicalError.message });
      return;
    }

    const assignmentById = new Map(
      (assignmentResult.data ?? []).map((assignment) => [assignment.id, assignment]),
    );
    const practicalById = new Map((practicals ?? []).map((practical) => [practical.id, practical]));
    const assessmentByReport = new Map(
      (assessments ?? []).map((assessment) => [assessment.report_id, assessment]),
    );
    const itemsByAssessment = new Map<string, typeof itemResult.data>();
    for (const item of itemResult.data ?? []) {
      const items = itemsByAssessment.get(item.assessment_id) ?? [];
      items.push(item);
      itemsByAssessment.set(item.assessment_id, items);
    }

    const assessmentItems = Array.from(itemsByAssessment.values()).flat();
    const { data: fields, error: fieldError } = assessmentItems.length
      ? await client
          .from("practical_fields")
          .select("id,title")
          .in("id", [...new Set(assessmentItems.map((item) => item.field_id))])
      : { data: [], error: null };
    if (fieldError) {
      setLoading(false);
      console.error("Could not load assessed field titles.", fieldError);
      toast.error("Field feedback could not be loaded", { description: fieldError.message });
      return;
    }
    const fieldById = new Map((fields ?? []).map((field) => [field.id, field.title]));

    setResults(
      reports.flatMap((report) => {
        const assessment = assessmentByReport.get(report.id);
        const assignment = assignmentById.get(report.assignment_id);
        const practical = assignment ? practicalById.get(assignment.practical_id) : undefined;
        if (!assessment || !practical || assessment.final_total === null) return [];
        return [
          {
            reportId: report.id,
            practicalTitle: practical.title,
            total: assessment.final_total,
            feedback: assessment.feedback ?? "",
            fields: (itemsByAssessment.get(assessment.id) ?? []).flatMap((item) =>
              item.final_points === null
                ? []
                : [
                    {
                      title: fieldById.get(item.field_id) ?? "Report field",
                      finalPoints: item.final_points,
                      feedback: item.feedback,
                      technologistFeedback: item.technologist_feedback,
                    },
                  ],
            ),
          },
        ];
      }),
    );
    setLoading(false);
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading)
    return <p className="text-sm text-muted-foreground">Loading approved assessments…</p>;
  if (!results.length) {
    return (
      <EmptyState
        icon={feedbackOnly ? Sparkles : Award}
        title={feedbackOnly ? "No approved feedback yet" : "No approved marks yet"}
        description="Marks and feedback are visible here only after a Technologist reviews and approves the assessment."
      />
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <SectionCard
          key={result.reportId}
          title={result.practicalTitle}
          action={<strong>{result.total} marks</strong>}
        >
          <p className="mb-4 text-sm">{result.feedback}</p>
          <ul className="space-y-3">
            {result.fields.map((field) => (
              <li key={field.title} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{field.title}</h3>
                  <span className="text-sm font-semibold">{field.finalPoints}</span>
                </div>
                {feedbackOnly && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {field.technologistFeedback || field.feedback}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      ))}
    </div>
  );
}

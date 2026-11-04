import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, SectionCard } from "@/components/common/ui-bits";
import { requireSupabaseClient } from "@/lib/supabase";

type ReviewData = {
  id: string;
  status: string;
  studentName: string;
  matric: string;
  practicalTitle: string;
  assessmentId: string | null;
  assessmentStatus: string | null;
  suggestedTotal: number | null;
  finalTotal: number | null;
  feedback: string | null;
  approvedAt: string | null;
  fields: Array<{
    id: string;
    title: string;
    maxPoints: number;
    answer: string;
    suggestedPoints: number | null;
    finalPoints: number | null;
    feedback: string;
    technologistFeedback: string;
  }>;
};

export function ReportReview({ reportId }: { reportId?: string }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const client = requireSupabaseClient();
      const { data: report, error: reportError } = await client
        .from("reports")
        .select("id,assignment_id,student_id,status")
        .eq("id", reportId)
        .maybeSingle();
      if (reportError) throw reportError;
      if (!report) throw new Error("This report could not be found.");

      const { data: assignment, error: assignmentError } = await client
        .from("assignments")
        .select("practical_id")
        .eq("id", report.assignment_id)
        .single();
      if (assignmentError) throw assignmentError;

      const [profileResult, practicalResult, fieldResult, pageResult, assessmentResult] =
        await Promise.all([
          client
            .from("profiles")
            .select("full_name,matric_number")
            .eq("user_id", report.student_id)
            .single(),
          client.from("practicals").select("title").eq("id", assignment.practical_id).single(),
          client
            .from("practical_fields")
            .select("id,title,max_points")
            .eq("practical_id", assignment.practical_id)
            .order("position"),
          client.from("report_pages").select("id").eq("report_id", report.id).order("page_number"),
          client.from("ai_assessments").select("*").eq("report_id", report.id).maybeSingle(),
        ]);
      const queryError =
        profileResult.error ??
        practicalResult.error ??
        fieldResult.error ??
        pageResult.error ??
        assessmentResult.error;
      if (queryError) throw queryError;

      const pageIds = (pageResult.data ?? []).map((page) => page.id);
      const answerResult = pageIds.length
        ? await client.from("report_answers").select("field_id,answer").in("page_id", pageIds)
        : { data: [], error: null };
      if (answerResult.error) throw answerResult.error;
      const assessment = assessmentResult.data;
      const itemResult = assessment
        ? await client.from("ai_assessment_items").select("*").eq("assessment_id", assessment.id)
        : { data: [], error: null };
      if (itemResult.error) throw itemResult.error;

      const answerByField = new Map<string, string>();
      for (const answer of answerResult.data ?? []) {
        answerByField.set(
          answer.field_id,
          [answerByField.get(answer.field_id), answer.answer].filter(Boolean).join("\n\n"),
        );
      }
      const itemByField = new Map((itemResult.data ?? []).map((item) => [item.field_id, item]));
      setData({
        id: report.id,
        status: report.status,
        studentName: profileResult.data.full_name,
        matric: profileResult.data.matric_number,
        practicalTitle: practicalResult.data.title,
        assessmentId: assessment?.id ?? null,
        assessmentStatus: assessment?.status ?? null,
        suggestedTotal: assessment?.suggested_total ?? null,
        finalTotal: assessment?.final_total ?? null,
        feedback: assessment?.feedback ?? null,
        approvedAt: assessment?.approved_at ?? null,
        fields: (fieldResult.data ?? []).map((field) => {
          const item = itemByField.get(field.id);
          return {
            id: field.id,
            title: field.title,
            maxPoints: field.max_points,
            answer: answerByField.get(field.id) ?? "",
            suggestedPoints: item?.suggested_points ?? null,
            finalPoints: item?.final_points ?? null,
            feedback: item?.feedback ?? "",
            technologistFeedback: item?.technologist_feedback ?? "",
          };
        }),
      });
    } catch (error) {
      console.error("Could not load report assessment for review.", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Report review could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  const requestAssessment = async () => {
    if (!reportId) return;
    setAssessing(true);
    const { error } = await requireSupabaseClient().functions.invoke("assess-report", {
      body: { reportId },
    });
    setAssessing(false);
    if (error) {
      console.error("AI assessment could not be generated.", error);
      toast.error("AI suggestions could not be generated", { description: error.message });
      await load();
      return;
    }
    toast.success("AI field suggestions are ready for review");
    await load();
  };

  const updateField = (fieldId: string, patch: Partial<ReviewData["fields"][number]>) => {
    setData(
      (current) =>
        current && {
          ...current,
          fields: current.fields.map((field) =>
            field.id === fieldId ? { ...field, ...patch } : field,
          ),
        },
    );
  };

  const approveAssessment = async () => {
    if (!data?.assessmentId) return;
    setApproving(true);
    const client = requireSupabaseClient();
    for (const field of data.fields) {
      if (
        field.finalPoints === null ||
        field.finalPoints < 0 ||
        field.finalPoints > field.maxPoints
      ) {
        setApproving(false);
        toast.error(`Enter a valid mark for ${field.title}`, {
          description: `The mark must be between 0 and ${field.maxPoints}.`,
        });
        return;
      }
      const { error } = await client
        .from("ai_assessment_items")
        .update({
          final_points: field.finalPoints,
          technologist_feedback: field.technologistFeedback,
        })
        .eq("assessment_id", data.assessmentId)
        .eq("field_id", field.id);
      if (error) {
        setApproving(false);
        console.error("Could not save final field mark.", error);
        toast.error("Review changes could not be saved", { description: error.message });
        return;
      }
    }

    const { data: total, error } = await client.rpc("approve_ai_assessment", {
      p_assessment_id: data.assessmentId,
    });
    setApproving(false);
    if (error) {
      console.error("Could not approve the AI assessment.", error);
      toast.error("Assessment could not be approved", { description: error.message });
      return;
    }
    toast.success(`Assessment approved · ${total} marks`);
    await load();
  };

  if (!reportId) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Choose a report to review"
        description="Open a report from Report Submissions to generate AI suggestions and approve the final marks."
      />
    );
  }
  if (loading)
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="animate-spin" aria-label="Loading report review" />
      </div>
    );
  if (errorMessage)
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/40 p-5 text-sm text-destructive"
      >
        {errorMessage}
      </div>
    );
  if (!data) return null;

  return (
    <div className="space-y-5">
      <SectionCard title={data.practicalTitle}>
        <p className="text-sm text-muted-foreground">
          {data.studentName} · {data.matric} · Report {data.status}
        </p>
        {data.feedback && <p className="mt-4 rounded-lg bg-muted p-3 text-sm">{data.feedback}</p>}
      </SectionCard>

      {data.status === "submitted" && data.assessmentStatus !== "completed" && (
        <SectionCard title="AI rubric assessment">
          <p className="mb-4 text-sm text-muted-foreground">
            AI will score each report field against the criteria authored for this practical.
            Suggestions are never released as final marks without your approval.
            {data.assessmentStatus === "failed"
              ? " The previous attempt failed and can be retried."
              : ""}
          </p>
          <Button variant="accent" onClick={() => void requestAssessment()} disabled={assessing}>
            {assessing ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {assessing ? "Assessing report…" : "Generate AI suggestions"}
          </Button>
        </SectionCard>
      )}

      {data.fields.map((field) => (
        <SectionCard key={field.id} title={`${field.title} · ${field.maxPoints} marks`}>
          <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm">
            {field.answer || "No answer provided."}
          </div>
          {field.suggestedPoints !== null && (
            <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr]">
              <div>
                <Label htmlFor={`final-${field.id}`}>Final mark (max {field.maxPoints})</Label>
                <Input
                  id={`final-${field.id}`}
                  type="number"
                  min="0"
                  max={field.maxPoints}
                  step="0.01"
                  value={field.finalPoints ?? ""}
                  disabled={Boolean(data.approvedAt)}
                  onChange={(event) =>
                    updateField(field.id, {
                      finalPoints: event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  AI suggestion: {field.suggestedPoints}
                </p>
              </div>
              <div>
                <Label htmlFor={`feedback-${field.id}`}>Technologist feedback</Label>
                <Input
                  id={`feedback-${field.id}`}
                  value={field.technologistFeedback}
                  disabled={Boolean(data.approvedAt)}
                  onChange={(event) =>
                    updateField(field.id, { technologistFeedback: event.target.value })
                  }
                  placeholder={field.feedback}
                />
                <p className="mt-1 text-xs text-muted-foreground">AI feedback: {field.feedback}</p>
              </div>
            </div>
          )}
        </SectionCard>
      ))}

      {data.suggestedTotal !== null && (
        <SectionCard title="Assessment decision">
          <p className="text-sm">
            AI suggested total: <strong>{data.suggestedTotal}</strong>
          </p>
          {data.approvedAt ? (
            <p className="mt-2 text-sm text-accent-brand">
              Approved final total: <strong>{data.finalTotal}</strong>
            </p>
          ) : (
            <Button
              className="mt-4"
              variant="accent"
              onClick={() => void approveAssessment()}
              disabled={approving}
            >
              {approving ? <Loader2 className="animate-spin" /> : null}Approve final marks
            </Button>
          )}
        </SectionCard>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { FilePlus2, ImagePlus, Loader2, Save, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportAnswerField } from "@/components/booklet/ReportAnswerField";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PrototypeNotice, EmptyState, SectionCard } from "@/components/common/ui-bits";
import { useAuth } from "@/components/auth/AuthProvider";
import { hashReportCode, requireSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Report = Database["public"]["Tables"]["reports"]["Row"];
type ReportPage = Database["public"]["Tables"]["report_pages"]["Row"];
type ReportField = Database["public"]["Tables"]["practical_fields"]["Row"];
type Sketch = Database["public"]["Tables"]["report_sketches"]["Row"] & { previewUrl: string };

export function ReportBooklet({
  reportId,
  assignmentId,
  onReportCreated,
}: {
  reportId?: string;
  assignmentId?: string;
  onReportCreated: (id: string) => void;
}) {
  const { profile, session } = useAuth();
  const [code, setCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(Boolean(reportId));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [practicalTitle, setPracticalTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [fields, setFields] = useState<ReportField[]>([]);
  const [pages, setPages] = useState<ReportPage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [dirty, setDirty] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const page = pages[pageIndex];
  const isDraft = report?.status === "draft";

  const loadReport = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setLoadError("");
    try {
      const client = requireSupabaseClient();
      const { data: reportData, error: reportError } = await client
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();
      if (reportError) throw reportError;
      if (!reportData) throw new Error("This report is not available to your account.");

      const { data: assignment, error: assignmentError } = await client
        .from("assignments")
        .select("practical_id")
        .eq("id", reportData.assignment_id)
        .maybeSingle();
      if (assignmentError) throw assignmentError;
      if (!assignment)
        throw new Error("The practical assignment for this report could not be found.");

      const [practicalResult, fieldResult, pageResult, sketchResult] = await Promise.all([
        client
          .from("practicals")
          .select("title,course_code")
          .eq("id", assignment.practical_id)
          .single(),
        client
          .from("practical_fields")
          .select("*")
          .eq("practical_id", assignment.practical_id)
          .order("position"),
        client.from("report_pages").select("*").eq("report_id", reportData.id).order("page_number"),
        client.from("report_sketches").select("*").eq("report_id", reportData.id).order("position"),
      ]);
      const queryError =
        practicalResult.error ?? fieldResult.error ?? pageResult.error ?? sketchResult.error;
      if (queryError) throw queryError;

      const loadedPages = pageResult.data ?? [];
      const answerResult = loadedPages.length
        ? await client
            .from("report_answers")
            .select("*")
            .in(
              "page_id",
              loadedPages.map((item) => item.id),
            )
        : { data: [], error: null };
      if (answerResult.error) throw answerResult.error;

      const signedSketches = await Promise.all(
        (sketchResult.data ?? []).map(async (sketch) => {
          const { data, error } = await client.storage
            .from("report-sketches")
            .createSignedUrl(sketch.object_path, 60 * 60);
          if (error) throw error;
          return { ...sketch, previewUrl: data.signedUrl };
        }),
      );

      setReport(reportData);
      setPracticalTitle(practicalResult.data.title);
      setCourseCode(practicalResult.data.course_code);
      setFields(fieldResult.data ?? []);
      setPages(loadedPages);
      setAnswers(
        Object.fromEntries(
          (answerResult.data ?? []).map((answer) => [
            `${answer.page_id}:${answer.field_id}`,
            answer.answer,
          ]),
        ),
      );
      setSketches(signedSketches);
      setDirty(false);
    } catch (error) {
      console.error("Could not load the practical report.", error);
      setLoadError(error instanceof Error ? error.message : "The report could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const claimCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignmentId || !code.trim()) return;
    setClaiming(true);
    try {
      const client = requireSupabaseClient();
      const codeHash = await hashReportCode(code);
      const { data, error } = await client.rpc("claim_report_code", { p_code_hash: codeHash });
      if (error) throw error;
      setCode("");
      onReportCreated(data);
    } catch (error) {
      console.error("Could not claim the one-time report code.", error);
      toast.error("Report code could not be used", {
        description:
          error instanceof Error ? error.message : "Check the code or contact your Technologist.",
      });
    } finally {
      setClaiming(false);
    }
  };

  const saveDraft = async () => {
    if (!report || !page) return;
    setSaving(true);
    try {
      const client = requireSupabaseClient();
      const rows = pages.flatMap((reportPage) =>
        fields.map((field) => ({
          page_id: reportPage.id,
          field_id: field.id,
          answer: answers[`${reportPage.id}:${field.id}`] ?? "",
        })),
      );
      const { error } = await client
        .from("report_answers")
        .upsert(rows, { onConflict: "page_id,field_id" });
      if (error) throw error;
      setDirty(false);
      toast.success("Draft saved");
    } catch (error) {
      console.error("Could not save report answers.", error);
      toast.error("Draft could not be saved", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const addPage = async () => {
    if (!report) return;
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("report_pages")
      .insert({ report_id: report.id, page_number: pages.length + 1 })
      .select("*")
      .single();
    if (error) {
      console.error("Could not add a report page.", error);
      toast.error("A new page could not be added", { description: error.message });
      return;
    }
    setPages((current) => [...current, data]);
    setPageIndex(pages.length);
  };

  const uploadImages = async (files: FileList | null) => {
    if (!report || !session || !files?.length) return;
    const remaining = 5 - sketches.length;
    if (remaining <= 0) {
      toast.error("This report already has the maximum of five images");
      return;
    }
    const chosen = Array.from(files).slice(0, remaining);
    if (files.length > remaining)
      toast.info(`Only ${remaining} more image${remaining === 1 ? "" : "s"} can be added.`);
    const client = requireSupabaseClient();
    const usedPositions = new Set(sketches.map((sketch) => sketch.position));

    for (const file of chosen) {
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        toast.error(`${file.name} is not a JPG, JPEG, or PNG image.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 10 MB per-image limit.`);
        continue;
      }
      const extension = file.type === "image/png" ? "png" : "jpg";
      const path = `${session.user.id}/${report.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await client.storage
        .from("report-sketches")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) {
        console.error("Could not upload report sketch.", uploadError);
        toast.error(`Could not upload ${file.name}`, { description: uploadError.message });
        continue;
      }

      const position = Array.from({ length: 5 }, (_, index) => index).find(
        (candidate) => !usedPositions.has(candidate),
      );
      if (position === undefined) {
        toast.error("This report already has the maximum of five images");
        break;
      }
      const { data: sketch, error: recordError } = await client
        .from("report_sketches")
        .insert({ report_id: report.id, object_path: path, position })
        .select("*")
        .single();
      if (recordError) {
        console.error("Could not register uploaded report sketch.", recordError);
        const { error: cleanupError } = await client.storage.from("report-sketches").remove([path]);
        if (cleanupError)
          console.error("Could not remove the unregistered sketch upload.", cleanupError);
        toast.error(`Could not add ${file.name} to the report`, {
          description: recordError.message,
        });
        continue;
      }
      usedPositions.add(position);

      const { data: signedUrl, error: signedUrlError } = await client.storage
        .from("report-sketches")
        .createSignedUrl(path, 60 * 60);
      if (signedUrlError) {
        console.error("Could not create a preview URL for uploaded sketch.", signedUrlError);
        toast.error("Image uploaded but preview could not be created", {
          description: signedUrlError.message,
        });
        setSketches((current) => [...current, { ...sketch, previewUrl: "" }]);
        continue;
      }
      setSketches((current) => [...current, { ...sketch, previewUrl: signedUrl.signedUrl }]);
    }
  };

  const removeSketch = async (sketch: Sketch) => {
    const client = requireSupabaseClient();
    const { error: rowError } = await client.from("report_sketches").delete().eq("id", sketch.id);
    if (rowError) {
      console.error("Could not remove report sketch record.", rowError);
      toast.error("Image could not be removed", { description: rowError.message });
      return;
    }
    const { error: objectError } = await client.storage
      .from("report-sketches")
      .remove([sketch.object_path]);
    if (objectError) {
      console.error("Could not remove report sketch from private storage.", objectError);
      toast.error("Image record removed, but the stored image could not be deleted.", {
        description: objectError.message,
      });
    }
    setSketches((current) => current.filter((item) => item.id !== sketch.id));
  };

  const submitReport = async () => {
    if (!report) return;
    const client = requireSupabaseClient();
    const { error } = await client.rpc("submit_report", { p_report_id: report.id });
    if (error) {
      console.error("Could not submit report.", error);
      toast.error("Report could not be submitted", { description: error.message });
      return;
    }
    const { error: assessmentError } = await client.functions.invoke("assess-report", {
      body: { reportId: report.id },
    });
    if (assessmentError) {
      console.error(
        "Report was submitted, but automatic AI assessment did not start.",
        assessmentError,
      );
      toast.warning("Report submitted; AI assessment could not start", {
        description: "Your Technologist can retry the assessment from the review queue.",
      });
    } else {
      toast.success("Report submitted", {
        description:
          "AI suggestions are being prepared for Technologist review. Final marks require approval.",
      });
    }
    await loadReport();
  };

  if (assignmentId && !reportId) {
    return (
      <SectionCard title="Start your assigned report">
        <PrototypeNotice>
          Enter the one-time code issued to you by your Technologist. The code is linked to your
          signed-in account and this practical.
        </PrototypeNotice>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={claimCode}>
          <div className="flex-1">
            <Label htmlFor="report-code">One-time report code</Label>
            <Input
              id="report-code"
              autoComplete="off"
              inputMode="text"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              maxLength={32}
              required
            />
          </div>
          <Button type="submit" className="self-end" disabled={claiming}>
            {claiming ? <Loader2 className="animate-spin" /> : <FilePlus2 />}Open report
          </Button>
        </form>
      </SectionCard>
    );
  }

  if (loading)
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="animate-spin" aria-label="Loading report" />
      </div>
    );
  if (loadError)
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/40 p-5 text-sm text-destructive"
      >
        {loadError}
      </div>
    );
  if (!report || !page)
    return (
      <EmptyState
        icon={FilePlus2}
        title="Report not available"
        description="Open a practical assigned to your account to start or continue a report."
      />
    );

  return (
    <div className="space-y-5">
      <PrototypeNotice>
        Your report is attached to your signed-in account. Text can only be saved while the report
        is a draft. Pasting is blocked in answer fields as a basic deterrent, not proof of
        authorship.
      </PrototypeNotice>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className="border-b bg-primary px-6 py-5 text-primary-foreground">
          <div className="text-xs uppercase tracking-widest opacity-75">
            {courseCode || "Assigned practical"} · {report.status}
          </div>
          <div className="mt-1 text-lg font-semibold">{practicalTitle}</div>
          <div className="mt-1 text-sm opacity-80">
            {profile?.full_name} · {profile?.matric_number}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div className="flex flex-wrap gap-2" aria-label="Report pages">
            {pages.map((item, index) => (
              <Button
                key={item.id}
                variant={index === pageIndex ? "secondary" : "outline"}
                size="sm"
                onClick={() => setPageIndex(index)}
              >
                Page {index + 1}
              </Button>
            ))}
          </div>
          {isDraft && (
            <Button variant="outline" size="sm" onClick={() => void addPage()}>
              <FilePlus2 />
              Add page
            </Button>
          )}
        </div>

        <section className="space-y-5 px-6 py-5" aria-label={`Report page ${pageIndex + 1}`}>
          <h2 className="font-semibold">Report page {pageIndex + 1}</h2>
          {fields.map((field) => {
            const key = `${page.id}:${field.id}`;
            return (
              <ReportAnswerField
                key={field.id}
                id={key}
                title={field.title}
                instructions={field.instructions}
                value={answers[key] ?? ""}
                required={field.required}
                disabled={!isDraft}
                onChange={(value) => {
                  setAnswers((current) => ({ ...current, [key]: value }));
                  setDirty(true);
                }}
              />
            );
          })}
        </section>

        <section className="space-y-3 border-t px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Diagrams / Sketches</h2>
              <p className="text-sm text-muted-foreground">
                Up to five JPG/JPEG/PNG images, 10 MB each. Stored privately with this report.
              </p>
            </div>
            {isDraft && sketches.length < 5 && (
              <Button variant="outline" onClick={() => fileInput.current?.click()}>
                <ImagePlus />
                Add image ({sketches.length}/5)
              </Button>
            )}
          </div>
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            aria-label="Upload report sketches"
            onChange={(event) => {
              void uploadImages(event.target.files);
              event.target.value = "";
            }}
          />
          {sketches.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {sketches.map((sketch) => (
                <li key={sketch.id} className="overflow-hidden rounded-lg border">
                  {sketch.previewUrl ? (
                    <img
                      src={sketch.previewUrl}
                      alt="Uploaded report sketch"
                      className="max-h-64 w-full bg-muted object-contain"
                    />
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">
                      Image uploaded; preview is unavailable.
                    </p>
                  )}
                  {isDraft && (
                    <Button
                      className="m-2"
                      variant="outline"
                      size="sm"
                      onClick={() => void removeSketch(sketch)}
                    >
                      <Trash2 />
                      Remove image
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isDraft && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Upload className="size-3.5" />
              Sketches are private and visible only to you and authorized Technologists.
            </p>
          )}
        </section>

        <div className="flex flex-col gap-3 border-t bg-muted/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
            {isDraft
              ? dirty
                ? "Unsaved changes"
                : "Draft saved to your account"
              : `Report ${report.status}`}
          </p>
          {isDraft && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => void saveDraft()} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}Save Draft
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="accent">
                    <Send />
                    Submit Report
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit report for review?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Required fields must be completed. Once submitted, your answers are locked
                      while a Technologist reviews the report.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep editing</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void submitReport()}>
                      Submit report
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

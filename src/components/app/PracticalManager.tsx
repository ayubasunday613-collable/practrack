import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Clipboard, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, SectionCard } from "@/components/common/ui-bits";
import { createReportCode, hashReportCode, requireSupabaseClient } from "@/lib/supabase";
import { MAX_MANUAL_SIZE, extractPracticalManualText } from "@/lib/practical-manual";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Database } from "@/lib/database.types";

type Practical = Database["public"]["Tables"]["practicals"]["Row"];
type Student = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "user_id" | "full_name" | "matric_number" | "department" | "level"
>;
type PracticalFieldInput = {
  title: string;
  instructions: string;
  marking_criteria: string;
  max_points: string;
  required: boolean;
  standard: boolean;
};
type ManualDraft = {
  title: string;
  courseCode: string;
  description: string;
  fields: Array<{
    title: string;
    instructions: string;
    marking_criteria: string;
    max_points: number;
    required: boolean;
  }>;
};

function isManualDraft(value: unknown): value is ManualDraft {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record["title"] === "string" &&
    typeof record["courseCode"] === "string" &&
    typeof record["description"] === "string" &&
    Array.isArray(record["fields"]) &&
    record["fields"].length === standardSections.length &&
    record["fields"].every((item, index) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
      const field = item as Record<string, unknown>;
      return (
        field["title"] === standardSections[index]?.[0] &&
        typeof field["instructions"] === "string" &&
        typeof field["marking_criteria"] === "string" &&
        typeof field["max_points"] === "number" &&
        Number.isFinite(field["max_points"]) &&
        field["max_points"] > 0 &&
        field["required"] === true
      );
    })
  );
}

const standardSections = [
  ["Title", "State the title of the practical."],
  ["Aim", "State the overall aim of the practical."],
  ["Objectives", "List the specific objectives of the practical."],
  ["Materials / Tools / Equipment", "List the materials, tools, and equipment used."],
  ["Theory", "Explain the principles and relevant theory behind the practical."],
  ["Diagram", "Add and label a relevant diagram where applicable."],
  ["Results / Calculations", "Present results, observations, and calculations with units."],
  ["Assignment", "Answer any assignment questions given for this practical."],
  ["Procedure", "Describe the steps followed to carry out the practical."],
  ["Precautions", "List the safety measures and precautions observed."],
  ["Observations", "Record relevant observations made during the practical."],
  ["Conclusions", "Summarize the outcome and conclusions drawn from the practical."],
] as const;

const sectionCriteriaPlaceholder = "TODO: Define marking criteria for this section.";

const standardField = (title: string, instructions: string): PracticalFieldInput => ({
  title,
  instructions,
  marking_criteria: sectionCriteriaPlaceholder,
  max_points: "10",
  required: true,
  standard: true,
});

const standardFields = (): PracticalFieldInput[] =>
  standardSections.map(([title, instructions]) => standardField(title, instructions));

const blankField = (): PracticalFieldInput => ({
  title: "",
  instructions: "",
  marking_criteria: sectionCriteriaPlaceholder,
  max_points: "10",
  required: true,
  standard: false,
});

export function PracticalManager() {
  const { session } = useAuth();
  const [practicals, setPracticals] = useState<Practical[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<PracticalFieldInput[]>(standardFields);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [existingManual, setExistingManual] = useState<{ path: string; name: string } | null>(null);
  const [extractingManual, setExtractingManual] = useState(false);
  const [studentSelection, setStudentSelection] = useState<Record<string, string>>({});

  const totalPoints = useMemo(
    () => fields.reduce((total, field) => total + (Number(field.max_points) || 0), 0),
    [fields],
  );

  const loadData = useCallback(async () => {
    const client = requireSupabaseClient();
    setLoading(true);
    const [practicalResult, studentResult] = await Promise.all([
      client.from("practicals").select("*").order("created_at", { ascending: false }),
      client
        .from("profiles")
        .select("user_id,full_name,matric_number,department,level")
        .eq("role", "student")
        .eq("status", "approved")
        .order("full_name"),
    ]);
    setLoading(false);
    if (practicalResult.error || studentResult.error) {
      const error = practicalResult.error ?? studentResult.error;
      console.error("Could not load practicals and approved students.", error);
      toast.error("Could not load practical management data", { description: error?.message });
      return;
    }
    setPracticals(practicalResult.data ?? []);
    setStudents(studentResult.data ?? []);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateField = (index: number, patch: Partial<PracticalFieldInput>) => {
    setFields((current) =>
      current.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    );
  };

  const extractManual = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_MANUAL_SIZE) {
      toast.error("Manual file is too large", { description: "Choose a file up to 20 MB." });
      return;
    }

    setExtractingManual(true);
    try {
      const text = await extractPracticalManualText(file);
      const client = requireSupabaseClient();
      const { data, error } = await client.functions.invoke<unknown>("extract-practical-manual", {
        body: { text, title, courseCode },
      });
      if (error) throw error;
      if (!isManualDraft(data)) throw new Error("The AI returned an incomplete report draft.");

      setTitle(data.title);
      setCourseCode(data.courseCode);
      setDescription(data.description);
      setFields(
        data.fields.map((field) => ({
          title: field.title,
          instructions: field.instructions,
          marking_criteria: field.marking_criteria,
          max_points: String(field.max_points),
          required: true,
          standard: true,
        })),
      );
      setManualFile(file);
      toast.success("Manual extracted into a draft", {
        description:
          "Review and correct every AI-suggested field and marking criterion before publishing.",
      });
    } catch (error) {
      console.error("Could not extract the practical manual.", error);
      toast.error("Manual could not be processed", {
        description: error instanceof Error ? error.message : "Check the file and try again.",
      });
    } finally {
      setExtractingManual(false);
    }
  };

  const createPractical = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Enter a practical title");
      return;
    }
    if (
      !fields.length ||
      fields.some(
        (field) =>
          !field.title.trim() || !field.marking_criteria.trim() || Number(field.max_points) <= 0,
      ) ||
      standardSections.some(
        ([sectionTitle]) => !fields.some((field) => field.title === sectionTitle),
      )
    ) {
      toast.error("Complete each report field", {
        description:
          "Keep all 12 standard sections and give every field marking criteria and a positive mark value.",
      });
      return;
    }
    setSaving(true);
    const client = requireSupabaseClient();
    let uploadedManualPath: string | null = null;
    let savedPracticalId: string | null = null;
    let cleanupWarning: string | null = null;
    const fieldPayload = fields.map((field) => ({
      title: field.title.trim(),
      instructions: field.instructions.trim(),
      marking_criteria: field.marking_criteria.trim(),
      max_points: Number(field.max_points),
      required: field.required,
    }));
    try {
      if (manualFile) {
        if (!session) throw new Error("Sign in again before uploading the manual.");
        const extension = manualFile.name.split(".").pop()?.toLowerCase();
        const contentTypes: Record<string, string> = {
          pdf: "application/pdf",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          txt: "text/plain",
        };
        if (!extension || !contentTypes[extension])
          throw new Error("Choose a PDF, DOCX, or TXT file.");
        const manualPath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await client.storage
          .from("practical-manuals")
          .upload(manualPath, manualFile, { contentType: contentTypes[extension] });
        if (uploadError) throw uploadError;
        uploadedManualPath = manualPath;
      }

      if (editingId) {
        const { error } = await client.rpc("update_practical_with_fields", {
          p_practical_id: editingId,
          p_title: title.trim(),
          p_course_code: courseCode.trim(),
          p_description: description.trim(),
          p_fields: fieldPayload,
        });
        if (error) throw error;
        savedPracticalId = editingId;
      } else {
        const { data, error } = await client.rpc("create_practical_with_fields", {
          p_title: title.trim(),
          p_course_code: courseCode.trim(),
          p_description: description.trim(),
          p_due_at: null,
          p_fields: fieldPayload,
        });
        if (error) throw error;
        savedPracticalId = data;
      }

      if (manualFile && uploadedManualPath && savedPracticalId) {
        const { error } = await client.rpc("attach_practical_manual", {
          p_practical_id: savedPracticalId,
          p_manual_path: uploadedManualPath,
          p_manual_name: manualFile.name,
        });
        if (error) {
          setEditingId(savedPracticalId);
          throw new Error(
            `The practical was saved, but its manual could not be attached. Edit this draft and upload the manual again. ${error.message}`,
          );
        }

        if (existingManual && existingManual.path !== uploadedManualPath) {
          const { error: removeError } = await client.storage
            .from("practical-manuals")
            .remove([existingManual.path]);
          if (removeError) {
            console.error("The replaced practical manual could not be removed.", removeError);
            toast.warning("New manual attached; the previous file could not be deleted.", {
              description: removeError.message,
            });
          }
        }
      }

      toast.success("Practical saved as a draft", {
        description: "Review the AI suggestions and publish it before assigning it to students.",
      });
      setTitle("");
      setCourseCode("");
      setDescription("");
      setFields(standardFields());
      setManualFile(null);
      setExistingManual(null);
      setEditingId(null);
      await loadData();
    } catch (error) {
      if (uploadedManualPath) {
        const { error: removeError } = await client.storage
          .from("practical-manuals")
          .remove([uploadedManualPath]);
        if (removeError) {
          console.error("Could not clean up an unattached practical manual.", removeError);
          cleanupWarning = " The uploaded file could not be deleted; contact support to remove it.";
        }
      }
      console.error("Could not create the practical and its rubric fields.", error);
      toast.error("Practical could not be saved", {
        description: `${error instanceof Error ? error.message : "Try again."}${cleanupWarning ?? ""}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const editPractical = async (practical: Practical) => {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("practical_fields")
      .select("title,instructions,marking_criteria,max_points,required")
      .eq("practical_id", practical.id)
      .order("position");
    if (error) {
      console.error("Could not load practical fields for editing.", error);
      toast.error("Practical fields could not be loaded", { description: error.message });
      return;
    }
    if (practical.status === "active") {
      const { data: assignments, error: assignmentError } = await client
        .from("assignments")
        .select("id")
        .eq("practical_id", practical.id);
      if (assignmentError) {
        console.error("Could not check reports before editing the practical.", assignmentError);
        toast.error("Practical could not be checked for existing reports", {
          description: assignmentError.message,
        });
        return;
      }
      if (assignments?.length) {
        const { count, error: reportError } = await client
          .from("reports")
          .select("id", { count: "exact", head: true })
          .in(
            "assignment_id",
            assignments.map((assignment) => assignment.id),
          );
        if (reportError) {
          console.error("Could not check reports before editing the practical.", reportError);
          toast.error("Practical could not be checked for existing reports", {
            description: reportError.message,
          });
          return;
        }
        if (count) {
          toast.error(
            "This practical cannot be edited because a student has already started a report.",
          );
          return;
        }
      }
    }
    setEditingId(practical.id);
    setTitle(practical.title);
    setCourseCode(practical.course_code);
    setDescription(practical.description);
    setManualFile(null);
    setExistingManual(
      practical.manual_path && practical.manual_name
        ? { path: practical.manual_path, name: practical.manual_name }
        : null,
    );
    const savedFields = (data ?? []).map((field) => {
      const standard = standardSections.some(([title]) => title === field.title);
      return {
        title: field.title,
        instructions: field.instructions,
        marking_criteria: field.marking_criteria,
        max_points: String(field.max_points),
        required: standard || field.required,
        standard,
      };
    });
    const savedTitles = new Set(savedFields.map((field) => field.title));
    setFields([
      ...savedFields,
      ...standardSections
        .filter(([sectionTitle]) => !savedTitles.has(sectionTitle))
        .map(([sectionTitle, instructions]) => standardField(sectionTitle, instructions)),
    ]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setCourseCode("");
    setDescription("");
    setFields(standardFields());
    setManualFile(null);
    setExistingManual(null);
  };

  const publish = async (practical: Practical) => {
    const client = requireSupabaseClient();
    const { error } = await client.rpc("publish_practical", {
      p_practical_id: practical.id,
    });
    if (error) {
      console.error("Could not publish the practical.", error);
      toast.error("Practical could not be published", { description: error.message });
      return;
    }
    toast.success("Practical published");
    await loadData();
  };

  const archive = async (practical: Practical) => {
    const client = requireSupabaseClient();
    const { error } = await client
      .from("practicals")
      .update({ status: "archived" })
      .eq("id", practical.id);
    if (error) {
      console.error("Could not archive the practical.", error);
      toast.error("Practical could not be archived", { description: error.message });
      return;
    }
    await loadData();
  };

  const assignStudent = async (practical: Practical) => {
    const studentId = studentSelection[practical.id];
    if (!studentId) {
      toast.error("Select an approved student first");
      return;
    }

    setSaving(true);
    try {
      const code = createReportCode();
      const codeHash = await hashReportCode(code);
      const client = requireSupabaseClient();
      const { data: assignmentId, error } = await client.rpc("create_practical_report_code", {
        p_practical_id: practical.id,
        p_student_id: studentId,
        p_code_hash: codeHash,
        p_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      const { error: emailError } = await client.functions.invoke("send-assignment-notification", {
        body: { assignmentId, code },
      });
      if (emailError) {
        console.error("Practical assigned, but its student email could not be sent.", emailError);
        toast.warning("Practical assigned, but the code email failed", {
          description:
            "Check the Resend sender and secrets in Supabase, then assign again to issue and email a fresh code.",
        });
        return;
      }
      toast.success("Practical assigned and student emailed", {
        description: "The one-time report code expires in seven days.",
      });
    } catch (error) {
      console.error("Could not assign the practical and email its one-time code.", error);
      toast.error("Practical could not be assigned", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title={editingId ? "Edit draft practical" : "Create a practical"}>
        <form className="space-y-5" onSubmit={createPractical}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="practical-title">Practical title</Label>
              <Input
                id="practical-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div>
              <Label htmlFor="course-code">Course code (optional)</Label>
              <Input
                id="course-code"
                value={courseCode}
                onChange={(event) => setCourseCode(event.target.value)}
                maxLength={40}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="practical-description">Description (optional)</Label>
            <Textarea
              id="practical-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              rows={3}
            />
          </div>
          <div className="space-y-2 rounded-xl border p-4">
            <Label htmlFor="practical-manual">Practical manual (PDF, DOCX, or TXT)</Label>
            <p className="text-sm text-muted-foreground">
              AI will suggest a draft title, description, instructions, and marking criteria from
              selectable text. Scanned PDFs are not supported. Review and correct every suggestion
              before publishing.
            </p>
            {existingManual && <p className="text-sm">Attached manual: {existingManual.name}</p>}
            {manualFile && <p className="text-sm">Selected manual: {manualFile.name}</p>}
            <Input
              id="practical-manual"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(event) => void extractManual(event)}
              disabled={extractingManual || saving}
            />
            {extractingManual && (
              <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Extracting manual text and preparing suggested report fields…
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-semibold">Report fields and marking criteria</h3>
                <p className="text-sm text-muted-foreground">
                  All 12 standard sections are required. Set each section’s marks and criteria;
                  review AI suggestions and replace any inaccurate content before publishing. You
                  may also add extra fields.
                </p>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">
                Total marks: {totalPoints}
              </div>
            </div>
            {fields.map((field, index) => (
              <fieldset key={index} className="space-y-3 rounded-xl border p-4">
                <legend className="px-1 text-sm font-medium">Field {index + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto]">
                  <div>
                    <Label htmlFor={`field-title-${index}`}>Field title</Label>
                    <Input
                      id={`field-title-${index}`}
                      value={field.title}
                      onChange={(event) => updateField(index, { title: event.target.value })}
                      maxLength={160}
                      placeholder="For example: Aims / Objectives"
                      readOnly={field.standard}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`field-points-${index}`}>Maximum marks</Label>
                    <Input
                      id={`field-points-${index}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={field.max_points}
                      onChange={(event) => updateField(index, { max_points: event.target.value })}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Remove field ${index + 1}`}
                    disabled={fields.length === 1 || field.standard}
                    onClick={() => setFields((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div>
                  <Label htmlFor={`field-instructions-${index}`}>
                    Student instructions / what to include
                  </Label>
                  <Textarea
                    id={`field-instructions-${index}`}
                    value={field.instructions}
                    onChange={(event) => updateField(index, { instructions: event.target.value })}
                    rows={2}
                    maxLength={5000}
                  />
                </div>
                <div>
                  <Label htmlFor={`field-rubric-${index}`}>
                    Marking criteria for AI suggestions
                  </Label>
                  <Textarea
                    id={`field-rubric-${index}`}
                    value={field.marking_criteria}
                    onChange={(event) =>
                      updateField(index, { marking_criteria: event.target.value })
                    }
                    rows={3}
                    maxLength={10000}
                    required
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    disabled={field.standard}
                    onChange={(event) => updateField(index, { required: event.target.checked })}
                  />
                  Student must complete this field before submitting
                </label>
              </fieldset>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setFields((current) => [...current, blankField()])}
              disabled={fields.length >= 30}
            >
              <Plus />
              Add report field
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="accent" disabled={saving}>
              <Save />
              {editingId ? "Save practical changes" : "Save practical as draft"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={cancelEdit}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Practicals created">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading practicals…</p>
        ) : practicals.length === 0 ? (
          <EmptyState
            icon={Clipboard}
            title="No practicals created"
            description="Create your first practical above. Students only see practicals you publish and assign."
          />
        ) : (
          <ul className="space-y-4">
            {practicals.map((practical) => (
              <li key={practical.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{practical.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {practical.course_code || "No course code"} · {practical.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {practical.status === "draft" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void editPractical(practical)}
                        >
                          Edit
                        </Button>
                        <Button size="sm" onClick={() => void publish(practical)}>
                          Publish
                        </Button>
                      </>
                    )}
                    {practical.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void editPractical(practical)}
                      >
                        Edit report fields
                      </Button>
                    )}
                    {practical.status !== "archived" && (
                      <Button size="sm" variant="outline" onClick={() => void archive(practical)}>
                        <Archive />
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
                {practical.status === "active" && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={studentSelection[practical.id] ?? ""}
                      onValueChange={(value) =>
                        setStudentSelection((current) => ({ ...current, [practical.id]: value }))
                      }
                    >
                      <SelectTrigger
                        aria-label={`Assign ${practical.title} to student`}
                        className="sm:max-w-sm"
                      >
                        <SelectValue placeholder="Select an approved student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.user_id} value={student.user_id}>
                            {student.full_name} · {student.matric_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="accent"
                      disabled={saving || students.length === 0}
                      onClick={() => void assignStudent(practical)}
                    >
                      Assign & email report code
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

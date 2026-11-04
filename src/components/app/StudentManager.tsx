import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionCard } from "@/components/common/ui-bits";
import { requireSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function StudentManager() {
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStudents = useCallback(async () => {
    const client = requireSupabaseClient();
    setLoading(true);
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error("Could not load student registrations.", error);
      toast.error("Student records could not be loaded", { description: error.message });
      return;
    }
    setStudents(data ?? []);
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const setStatus = async (student: Profile, status: "approved" | "suspended") => {
    const client = requireSupabaseClient();
    const { error } = await client
      .from("profiles")
      .update({ status })
      .eq("user_id", student.user_id);
    if (error) {
      console.error("Could not update student approval status.", error);
      toast.error("Student status could not be updated", { description: error.message });
      return;
    }
    toast.success(status === "approved" ? "Student approved" : "Student access suspended");
    await loadStudents();
  };

  const pending = students.filter((student) => student.status === "pending");
  const approved = students.filter((student) => student.status === "approved");

  return (
    <div className="space-y-6">
      <SectionCard title={`Pending approval (${pending.length})`}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading registrations…</p>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No pending student registrations"
            description="New student accounts will appear here for verification."
          />
        ) : (
          <ul className="divide-y">
            {pending.map((student) => (
              <li
                key={student.user_id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <h3 className="font-medium">{student.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {student.matric_number} · {student.department} · {student.level}
                  </p>
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => void setStatus(student, "approved")}
                >
                  <CheckCircle2 />
                  Approve student
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={`Approved students (${approved.length})`}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading students…</p>
        ) : approved.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No approved students yet"
            description="Approve a registration above before assigning a practical."
          />
        ) : (
          <ul className="divide-y">
            {approved.map((student) => (
              <li
                key={student.user_id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <h3 className="font-medium">{student.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {student.matric_number} · {student.department} · {student.level}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void setStatus(student, "suspended")}
                >
                  <XCircle />
                  Suspend access
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
